const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const { options, createAudit, firestoreEvidence, storageEvidence } = require('./admin-operation-audit.cjs');

const config = options(process.argv.slice(2), ['bucket', 'cleanup', 'probe-id']);
const bucketName = config.bucket;
if (!bucketName || ![`${config.project}.firebasestorage.app`, `${config.project}.appspot.com`].includes(bucketName)) {
  throw new Error('Usa --bucket con el bucket del mismo proyecto explícito.');
}

async function main() {
  const app = initializeApp({ projectId: config.project, storageBucket: bucketName });
  try {
    const db = getFirestore(app);
    const run = createAudit(db, config);
    const probeId = config.cleanup ? config['probe-id'] : `probe-${config.requestId}`;
    if (config.cleanup && !/^probe-[a-f0-9-]{36}$/.test(probeId || '')) throw new Error('Limpieza requiere --probe-id del centinela sintético.');
    if (!config.cleanup && config['probe-id']) throw new Error('--probe-id sólo se usa con --cleanup.');
    const doc = db.doc(`recovery_probes/${probeId}`);
    const file = getStorage(app).bucket(bucketName).file(`recovery_probe/${probeId}/payload.txt`);
    const readDoc = async () => firestoreEvidence(await doc.get());
    const readFile = async () => storageEvidence(file);
    const original = {
      marker: 'pie-diabetico-recovery-canary',
      probeId,
      phase: 'before',
      createdAt: new Date().toISOString(),
    };
    const payload = Buffer.from(`restore-canary-${probeId}-${crypto.randomUUID()}`);
    const docResource = `recovery_probes/${probeId}`;
    const storageResource = `${bucketName}/recovery_probe/${probeId}/payload.txt`;

    if (config.cleanup) {
      const snapshot = await doc.get();
      if (!snapshot.exists || snapshot.data().marker !== 'pie-diabetico-recovery-canary' || snapshot.data().probeId !== probeId || snapshot.data().phase !== 'cleanup-ready') {
        throw new Error('El centinela no está marcado para limpieza.');
      }
      if (!(await readFile()).exists) throw new Error('Falta el objeto del centinela.');
      const [content] = await file.download();
      if (content.length > 1024 || !content.toString('utf8').startsWith(`restore-canary-${probeId}-`)) throw new Error('El objeto no corresponde al centinela sintético.');
      const generation = (await readFile()).generation;
      await run({ action: 'recovery.fixture.cleanup', resource: storageResource, readEvidence: readFile,
        mutate: () => file.delete({ preconditionOpts: { ifGenerationMatch: generation } }) });
      await run({ action: 'recovery.fixture.cleanup', resource: docResource, readEvidence: readDoc,
        mutate: () => doc.delete({ lastUpdateTime: snapshot.updateTime }) });
      console.log(JSON.stringify({ ok: true, projectId: config.project, requestId: config.requestId, probeId, cleaned: config.mode === 'execute' }));
      return;
    }

    if (config.mode === 'execute') {
      assert.equal((await readDoc()).exists, false, 'El centinela documental ya existe.');
      assert.equal((await readFile()).exists, false, 'El centinela Storage ya existe.');
    }
    await run({ action: 'recovery.fixture.create', resource: docResource, readEvidence: readDoc, mutate: () => doc.create(original) });
    await run({ action: 'recovery.fixture.upload', resource: storageResource, readEvidence: readFile,
      mutate: () => file.save(payload, { contentType: 'text/plain', resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { cacheControl: 'private, max-age=0, no-store' } }) });
    if (config.mode === 'dry-run') return;

    const beforeDelete = await doc.get();
    const [beforeBytes] = await file.download();
    assert.equal(beforeDelete.exists, true);
    assert.deepEqual(beforeBytes, payload);
    const backup = beforeDelete.data();
    await run({ action: 'recovery.fixture.delete', resource: docResource, readEvidence: readDoc, mutate: () => doc.delete({ lastUpdateTime: beforeDelete.updateTime }) });
    const generation = (await readFile()).generation;
    await run({ action: 'recovery.fixture.delete', resource: storageResource, readEvidence: readFile, mutate: () => file.delete({ preconditionOpts: { ifGenerationMatch: generation } }) });
    await run({ action: 'recovery.fixture.restore', resource: docResource, readEvidence: readDoc,
      mutate: () => doc.create({ ...backup, phase: 'restored', restoredAt: new Date().toISOString() }) });
    await run({ action: 'recovery.fixture.restore', resource: storageResource, readEvidence: readFile,
      mutate: () => file.save(beforeBytes, { contentType: 'text/plain', resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { cacheControl: 'private, max-age=0, no-store' } }) });
    const restored = await doc.get();
    const [restoredBytes] = await file.download();
    assert.equal(restored.exists, true);
    assert.equal(restored.data().marker, original.marker);
    assert.deepEqual(restoredBytes, beforeBytes);
    await run({ action: 'recovery.fixture.mark_cleanup_ready', resource: docResource, readEvidence: readDoc,
      mutate: () => doc.update({ phase: 'cleanup-ready', cleanupRequestedAt: new Date().toISOString() }) });
    console.log(JSON.stringify({ ok: true, projectId: config.project, requestId: config.requestId, probeId, restored: true, cleanupRequired: true }));
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
