const path = require('node:path');

function loadFirebaseAdminModules() {
  const candidates = [
    'firebase-admin/app',
    path.join(__dirname, '..', 'node_modules', 'firebase-admin', 'app'),
    path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin', 'app'),
  ];
  const firestoreCandidates = [
    'firebase-admin/firestore',
    path.join(__dirname, '..', 'node_modules', 'firebase-admin', 'firestore'),
    path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin', 'firestore'),
  ];
  const storageCandidates = [
    'firebase-admin/storage',
    path.join(__dirname, '..', 'node_modules', 'firebase-admin', 'storage'),
    path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin', 'storage'),
  ];

  let loadError = null;
  for (let i = 0; i < candidates.length; i += 1) {
    const specifier = candidates[i];
    try {
      return {
        app: require(specifier),
        firestore: require(firestoreCandidates[i]),
        storage: require(storageCandidates[i]),
      };
    } catch (error) {
      loadError = error;
    }
  }
  throw loadError || new Error('Unable to load firebase-admin modules');
}

const firebaseAdmin = loadFirebaseAdminModules();
const { initializeApp } = firebaseAdmin.app;
const { getFirestore } = firebaseAdmin.firestore;
const { getStorage } = firebaseAdmin.storage;
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

async function resolveStorageBucket(app, projectId) {
  const storage = getStorage(app);
  const explicit = process.env.STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  const candidates = [];
  if (explicit) candidates.push(explicit);
  candidates.push(`${projectId}.firebasestorage.app`);
  candidates.push(`${projectId}.appspot.com`);
  candidates.push('');

  let lastError = null;
  for (const candidate of candidates) {
    try {
      const bucket = candidate ? storage.bucket(candidate) : storage.bucket();
      await bucket.getMetadata();
      return bucket;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`No se pudo resolver un bucket válido para projectId=${projectId}`);
}

async function main() {
  const projectId = process.env.GCLOUD_PROJECT || 'demo-pie-diabetico';
  const app = initializeApp({
    projectId,
  });
  const db = getFirestore(app);
  const bucket = await resolveStorageBucket(app, projectId);

  const probeId = `probe-${Date.now()}`;
  const docRef = db.collection('recovery_probes').doc(probeId);
  const collectionRef = db.collection('recovery_probes');
  const storagePath = `recovery_probe/${probeId}/payload.txt`;
  const original = {
    marker: 'pie-diabetico-recovery-canary',
    probeId,
    phase: 'before',
    createdAt: new Date().toISOString(),
  };

  await docRef.set(original);
  const snapshotBefore = await docRef.get();
  assert.equal(snapshotBefore.exists, true);

  const originalPayload = `restore-canary-${probeId}-${Math.random().toString(16).slice(2)}`;
  await bucket.file(storagePath).save(originalPayload, {
    contentType: 'text/plain',
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0, no-store' },
  });

  const docBackup = snapshotBefore.data();
  const [storageBuffer] = await bucket.file(storagePath).download();
  const storageBackup = {
    path: storagePath,
    contentType: 'text/plain',
    bodyB64: storageBuffer.toString('base64'),
    checksum: crypto.createHash('sha256').update(storageBuffer).digest('hex'),
  };

  const backup = {
    ts: new Date().toISOString(),
    projectId: app.options.projectId,
    doc: { id: docRef.id, data: docBackup },
    storage: storageBackup,
  };

  // Simular incidente: borrado
  await docRef.delete();
  await bucket.file(storagePath).delete({ ignoreNotFound: true });

  const afterDelete = await docRef.get();
  assert.equal(afterDelete.exists, false);

  // Restauración
  const restored = {
    ...docBackup,
    phase: 'restored',
    restoredAt: new Date().toISOString(),
  };
  await docRef.set(restored);

  await bucket.file(storageBackup.path).save(Buffer.from(storageBackup.bodyB64, 'base64'), {
    contentType: storageBackup.contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0, no-store' },
  });

  const restoredDoc = await docRef.get();
  assert.equal(restoredDoc.exists, true);
  const restoredData = restoredDoc.data();
  assert.equal(restoredData.marker, original.marker);
  assert.equal(restoredData.phase, 'restored');

  const [restoredBuffer] = await bucket.file(storagePath).download();
  assert.equal(
    crypto.createHash('sha256').update(restoredBuffer).digest('hex'),
    storageBackup.checksum,
  );

  // Limpieza opcional: dejamos evidencia de que fue restaurado con éxito.
  const total = (await collectionRef.where('marker', '==', 'pie-diabetico-recovery-canary').get()).size;
  assert.equal(total >= 1, true);

  await docRef.set({
    ...restoredData,
    phase: 'cleanup-ready',
    cleanupRequestedAt: new Date().toISOString(),
    backupTs: backup.ts,
  }, { merge: true });

  console.log(JSON.stringify({
    ok: true,
    probeId,
    backupSizeBytes: Buffer.byteLength(JSON.stringify(backup), 'utf8'),
    totalMatchingProbes: total,
    restored: true,
  }));

  await app.delete();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
