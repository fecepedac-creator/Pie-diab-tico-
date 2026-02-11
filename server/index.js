import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(__dirname, 'data.json');
const UPLOADS = path.join(ROOT, 'uploads');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });
if (!fs.existsSync(DATA_PATH)) {
  fs.writeFileSync(DATA_PATH, JSON.stringify({
    users: [],
    appState: { patients: [], episodes: [], visits: [], referrals: [] }
  }, null, 2));
}

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_dev_secret';
const PORT = Number(process.env.API_PORT || 4000);

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

const readBody = (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    if (!raw) return resolve({});
    try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
  });
  req.on('error', reject);
});

const json = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
  });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });

  if (url.pathname.startsWith('/uploads/')) {
    const file = path.join(UPLOADS, path.basename(url.pathname));
    if (!fs.existsSync(file)) return json(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Access-Control-Allow-Origin': '*' });
    return fs.createReadStream(file).pipe(res);
  }

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    const { email, password, role = 'Médico Diabetología' } = await readBody(req);
    if (!email || !password) return json(res, 400, { error: 'email y password son requeridos' });
    const db = readData();
    if (db.users.some(u => u.email === email)) return json(res, 409, { error: 'Usuario ya existe' });
    const user = { id: crypto.randomUUID(), email, passwordHash: hashPassword(password), role };
    db.users.push(user);
    writeData(db);
    return json(res, 201, { ok: true });
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const { email, password } = await readBody(req);
    const db = readData();
    const user = db.users.find(u => u.email === email);
    if (!user || !verifyPassword(password, user.passwordHash)) return json(res, 401, { error: 'Credenciales inválidas' });
    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return json(res, 200, { token, user: { id: user.id, email: user.email, role: user.role } });
  }

  if (url.pathname.startsWith('/api/')) {
    const auth = req.headers.authorization?.replace('Bearer ', '');
    const user = verifyToken(auth);
    if (!user) return json(res, 401, { error: 'No autorizado' });

    if (url.pathname === '/api/state' && req.method === 'GET') {
      const db = readData();
      return json(res, 200, db.appState);
    }

    if (url.pathname === '/api/state' && req.method === 'PUT') {
      const nextState = await readBody(req);
      const db = readData();
      db.appState = {
        patients: Array.isArray(nextState.patients) ? nextState.patients : [],
        episodes: Array.isArray(nextState.episodes) ? nextState.episodes : [],
        visits: Array.isArray(nextState.visits) ? nextState.visits : [],
        referrals: Array.isArray(nextState.referrals) ? nextState.referrals : []
      };
      writeData(db);
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/uploads/photo' && req.method === 'POST') {
      const { dataUrl, filename = 'photo.jpg' } = await readBody(req);
      if (!dataUrl || !dataUrl.includes('base64,')) return json(res, 400, { error: 'Imagen inválida' });
      const base64 = dataUrl.split('base64,')[1];
      const ext = path.extname(filename) || '.jpg';
      const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
      fs.writeFileSync(path.join(UPLOADS, fileName), Buffer.from(base64, 'base64'));
      return json(res, 201, { url: `${process.env.PUBLIC_API_URL || `http://localhost:${PORT}`}/uploads/${fileName}` });
    }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('PostgreSQL-ready note: this lightweight backend stores JSON file by default.');
});
