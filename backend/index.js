import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, 'data.json');
const UPLOADS = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify({
    users: [],
    appState: { patients: [], episodes: [], visits: [], referrals: [] }
  }, null, 2));
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_dev_secret';
const PORT = process.env.PORT || 8080;
const PUBLIC_API_URL = process.env.PUBLIC_API_URL || `http://localhost:${PORT}`;

const readData = () => JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
const writeData = (data) => fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};
const verifyPassword = (password, stored) => {
  const [salt, oldHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === oldHash;
};

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const signToken = (payload) => {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
};
const verifyToken = (token) => {
  if (!token) return null;
  const [h, b, s] = token.split('.');
  if (!h || !b || !s) return null;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${b}`).digest('base64url');
  if (sig !== s) return null;
  const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf-8'));
  if (Date.now() > payload.exp) return null;
  return payload;
};

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, role = 'Médico Diabetología' } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email y password son requeridos' });
  
  const db = readData();
  if (db.users.some(u => u.email === email)) return res.status(409).json({ error: 'Usuario ya existe' });
  
  const user = { id: crypto.randomUUID(), email, passwordHash: hashPassword(password), role };
  db.users.push(user);
  writeData(db);
  res.status(201).json({ ok: true });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const db = readData();
  const user = db.users.find(u => u.email === email);
  
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

// Auth middleware
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization?.replace('Bearer ', '');
  const user = verifyToken(auth);
  if (!user) return res.status(401).json({ error: 'No autorizado' });
  req.user = user;
  next();
};

// Protected: Get state
app.get('/api/state', authMiddleware, (req, res) => {
  const db = readData();
  res.json(db.appState);
});

// Protected: Save state
app.put('/api/state', authMiddleware, (req, res) => {
  const nextState = req.body;
  const db = readData();
  db.appState = {
    patients: Array.isArray(nextState.patients) ? nextState.patients : [],
    episodes: Array.isArray(nextState.episodes) ? nextState.episodes : [],
    visits: Array.isArray(nextState.visits) ? nextState.visits : [],
    referrals: Array.isArray(nextState.referrals) ? nextState.referrals : []
  };
  writeData(db);
  res.json({ ok: true });
});

// Protected: Upload photo
app.post('/api/uploads/photo', authMiddleware, (req, res) => {
  const { dataUrl, filename = 'photo.jpg' } = req.body;
  if (!dataUrl || !dataUrl.includes('base64,')) {
    return res.status(400).json({ error: 'Imagen inválida' });
  }
  
  const base64 = dataUrl.split('base64,')[1];
  const ext = path.extname(filename) || '.jpg';
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOADS, fileName), Buffer.from(base64, 'base64'));
  
  res.status(201).json({ url: `${PUBLIC_API_URL}/uploads/${fileName}` });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_API_URL}`);
});
