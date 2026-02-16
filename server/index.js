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
const PORT = Number(process.env.API_PORT || 4000);
const MIGRATION_MODE = process.env.MT_MIGRATION_MODE === 'true';
const DEFAULT_CENTER_ID = process.env.DEFAULT_CENTER_ID || 'default-center';

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

const normalizeCenterId = (item, activeCenterId) => {
  if (item.centerId) return item.centerId;
  if (MIGRATION_MODE) return DEFAULT_CENTER_ID || activeCenterId;
  return null;
};

const ensureCenterId = (item, activeCenterId) => {
  const centerId = normalizeCenterId(item, activeCenterId);
  if (!centerId) throw new Error('centerId es obligatorio fuera de modo migración');
  if (centerId !== activeCenterId) throw new Error('centerId no coincide con el centro activo');
  return { ...item, centerId };
};

const getMembership = async (uid, centerId) => {
  if (!centerId) return null;
  const doc = await firestore.collection('pd_centers').doc(centerId).collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return doc.data();
};

const requireActiveCenter = async (req, user) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const body = req.method === 'PUT' || req.method === 'POST' ? await readBody(req) : {};
  const activeCenterId = url.searchParams.get('centerId') || body.centerId;
  if (!activeCenterId) return { error: { status: 400, message: 'activeCenterId/centerId requerido' } };
  const membership = await getMembership(user.sub, activeCenterId);
  if (!membership || membership.isActive === false) {
    return { error: { status: 403, message: 'Sin membresía activa para el centro solicitado' } };
  }
  return { activeCenterId, membership, body };
};

const getCenterScopedCollection = async (collectionName, centerId) => {
  const snapshot = await firestore.collection(collectionName).where('centerId', '==', centerId).get();
  return snapshot.docs.map(doc => doc.data());
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

  if (url.pathname.startsWith('/api/')) {
    const authHeader = req.headers.authorization?.replace('Bearer ', '');
    const user = await verifyToken(authHeader);
    if (!user) return json(res, 401, { error: 'No autorizado' });

    if (url.pathname === '/api/centers' && req.method === 'GET') {
      const centerDocs = await firestore.collection('pd_centers').get();
      const centers = [];
      const memberships = {};

      for (const doc of centerDocs.docs) {
        const center = { id: doc.id, ...doc.data() };
        const userMembership = await firestore.collection('pd_centers').doc(doc.id).collection('users').doc(user.sub).get();
        if (userMembership.exists && userMembership.data()?.isActive !== false) {
          centers.push(center);
          memberships[doc.id] = { uid: user.sub, ...(userMembership.data() || {}) };
        }
      }

      return json(res, 200, { centers, memberships });
    }

    if (url.pathname === '/api/state' && req.method === 'GET') {
      const scoped = await requireActiveCenter(req, user);
      if (scoped.error) return json(res, scoped.error.status, { error: scoped.error.message });

      const centerId = scoped.activeCenterId;
      const results = {
        patients: await getCenterScopedCollection('pd_patients', centerId),
        episodes: await getCenterScopedCollection('pd_episodes', centerId),
        visits: await getCenterScopedCollection('pd_visits', centerId),
        referrals: await getCenterScopedCollection('pd_referrals', centerId),
      };

      return json(res, 200, results);
    }

    if (url.pathname === '/api/state' && req.method === 'PUT') {
      const scoped = await requireActiveCenter(req, user);
      if (scoped.error) return json(res, scoped.error.status, { error: scoped.error.message });

      const nextState = scoped.body;
      const centerId = scoped.activeCenterId;
      const batch = firestore.batch();

      const updateCollection = async (key, items) => {
        if (!Array.isArray(items)) return;
        items.forEach(item => {
          if (!item.id) return;
          const normalized = ensureCenterId(item, centerId);
          const ref = firestore.collection(`pd_${key}`).doc(item.id);
          batch.set(ref, normalized, { merge: true });
        });
      };

      try {
        await updateCollection('patients', nextState.patients);
        await updateCollection('episodes', nextState.episodes);
        await updateCollection('visits', nextState.visits);
        await updateCollection('referrals', nextState.referrals);
      } catch (error) {
        return json(res, 400, { error: error.message });
      }

      await batch.commit();
      return json(res, 200, { ok: true });
    }

    if (url.pathname === '/api/settings/clinical' && req.method === 'GET') {
      const scoped = await requireActiveCenter(req, user);
      if (scoped.error) return json(res, scoped.error.status, { error: scoped.error.message });

      const doc = await firestore.collection('pd_centers').doc(scoped.activeCenterId).collection('settings').doc('clinical_config').get();
      if (!doc.exists) return json(res, 404, { error: 'Settings not found' });
      return json(res, 200, doc.data());
    }

    if (url.pathname === '/api/settings/clinical' && req.method === 'PUT') {
      if (user.role !== 'Admin') return json(res, 403, { error: 'Forbidden' });
      const scoped = await requireActiveCenter(req, user);
      if (scoped.error) return json(res, scoped.error.status, { error: scoped.error.message });

      const nextConfig = scoped.body;
      await firestore.collection('pd_centers').doc(scoped.activeCenterId).collection('settings').doc('clinical_config').set({
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

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500'
      });

      return json(res, 201, { url: signedUrl });
    }
  }

  return json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log('Firebase Cloud Mode: active');
  console.log(`Multi-tenant migration mode: ${MIGRATION_MODE ? 'ON' : 'OFF'} (default center: ${DEFAULT_CENTER_ID})`);
});
