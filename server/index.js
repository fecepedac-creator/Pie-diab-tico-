import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const UPLOADS = path.join(ROOT, 'uploads');
const SERVICE_ACCOUNT_PATH = path.join(ROOT, 'service-account.json');

if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// Initialize Firebase Admin
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
  });
  console.log('Firebase Admin initialized with project:', serviceAccount.project_id);
} else {
  console.error('CRITICAL: service-account.json NOT FOUND. Server may fail.');
}

const firestore = admin.firestore();
const COLLECTIONS = {
  USERS: 'pd_users',
  PATIENTS: 'pd_patients',
  EPISODES: 'pd_episodes',
  VISITS: 'pd_visits',
  REFERRALS: 'pd_referrals',
  SETTINGS: 'pd_settings'
};

const JWT_SECRET = process.env.JWT_SECRET || 'change_me_dev_secret';
const PORT = Number(process.env.API_PORT || 4000);

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
const verifyToken = async (token) => {
  if (!token) return null;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return {
      sub: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'Médico Diabetología'
    };
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
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

  // Authentication endpoints removed - now handled by Firebase Auth on client

  if (url.pathname.startsWith('/api/')) {
    const authHeader = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(authHeader);
    if (!user) return json(res, 401, { error: 'No autorizado' });

    if (url.pathname === '/api/state' && req.method === 'GET') {
      const results = {};
      const keys = ['patients', 'episodes', 'visits', 'referrals'];

      for (const key of keys) {
        const snapshot = await firestore.collection(`pd_${key}`).get();
        results[key] = snapshot.docs.map(doc => doc.data());
      }

      return json(res, 200, results);
    }

    if (url.pathname === '/api/state' && req.method === 'PUT') {
      const nextState = await readBody(req);
      const batch = firestore.batch();

      const updateCollection = async (key, items) => {
        if (!Array.isArray(items)) return;
        // This is a naive sync but maintains the current API contract
        // Delete all current (or better, just upsert)
        // For simplicity in Phase 1, we just upsert everything provided
        items.forEach(item => {
          if (!item.id) return;
          const ref = firestore.collection(`pd_${key}`).doc(item.id);
          batch.set(ref, item, { merge: true });
        });
      };

      await updateCollection('patients', nextState.patients);
      await updateCollection('episodes', nextState.episodes);
      await updateCollection('visits', nextState.visits);
      await updateCollection('referrals', nextState.referrals);

      await batch.commit();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/settings/clinical' && req.method === 'GET') {
      const doc = await firestore.collection(COLLECTIONS.SETTINGS).doc('clinical_config').get();
      if (!doc.exists) return json(res, 404, { error: 'Settings not found' });
      return json(res, 200, doc.data());
    }

    if (url.pathname === '/api/settings/clinical' && req.method === 'PUT') {
      if (user.role !== 'Admin') return json(res, 403, { error: 'Forbidden' });
      const nextConfig = await readBody(req);
      await firestore.collection(COLLECTIONS.SETTINGS).doc('clinical_config').set({
        ...nextConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: user.email
      }, { merge: true });
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/uploads/photo' && req.method === 'POST') {
      const { dataUrl, filename = 'photo.jpg' } = await readBody(req);
      if (!dataUrl || !dataUrl.includes('base64,')) return json(res, 400, { error: 'Imagen inválida' });

      const base64 = dataUrl.split('base64,')[1];
      const buffer = Buffer.from(base64, 'base64');
      const ext = path.extname(filename) || '.jpg';
      const fileName = `uploads/${Date.now()}-${crypto.randomUUID()}${ext}`;

      const bucket = admin.storage().bucket();
      const file = bucket.file(fileName);

      await file.save(buffer, {
        metadata: { contentType: `image/${ext.replace('.', '') || 'jpeg'}` }
      });

      // Make the file publicly accessible or get a signed URL
      // For simplicity in Phase 1, we make it public (not ideal for HIPAA but better than local)
      // Actually, let's use a long-lived signed URL for now to keep it "working" as before
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future
      });

      return json(res, 201, { url: signedUrl });
    }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Firebase Cloud Mode: active');
});
