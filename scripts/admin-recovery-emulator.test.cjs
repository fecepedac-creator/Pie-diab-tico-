const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('Requiere emuladores Firestore y Storage.');
const projectId = 'demo-pie-diabetico';
const requestId = crypto.randomUUID();
const baseArgs = ['scripts/recovery-smoke.cjs', '--project', projectId, '--bucket', `${projectId}.appspot.com`, '--operator', 'operador@ejemplo.test', '--ticket', 'T6-LOCAL', '--purpose', 'Prueba sintetica local'];

function call(args) {
  const result = spawnSync(process.execPath, [...baseArgs, ...args], { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Recovery failed: ${result.stderr}\n${result.stdout}`);
}

function callBootstrap(args) {
  const command = ['scripts/bootstrap_platform_admin.cjs', '--project', projectId, '--operator', 'operador@ejemplo.test', '--ticket', 'T6-LOCAL', '--purpose', 'Bootstrap sintetico local', '--email', 'admin@ejemplo.test', '--center-id', 'centro-admin-local', ...args];
  const result = spawnSync(process.execPath, command, { cwd: process.cwd(), env: process.env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Bootstrap failed: ${result.stderr}\n${result.stdout}`);
}

async function main() {
  const app = initializeApp({ projectId });
  try {
    const db = getFirestore(app);
    call(['--request-id', requestId]);
    assert.equal((await db.collection('adminOperationLogs').get()).size, 0, 'dry-run must not write');
    assert.equal((await db.doc(`recovery_probes/probe-${requestId}`).get()).exists, false);
    call(['--request-id', requestId, '--execute']);
    const logs = await db.collection('adminOperationLogs').get();
    assert.equal(logs.size, 7);
    for (const log of logs.docs) {
      const event = log.data();
      assert.equal(event.result, 'succeeded');
      assert.equal(event.projectId, projectId);
      assert.equal(event.requestId, requestId);
      assert.equal(event.actor.assurance, 'self_declared');
      assert.equal(event.ticket, 'T6-LOCAL');
      assert.equal(JSON.stringify(event).includes('restore-canary'), false, 'payload must not enter the audit');
    }
    const probe = await db.doc(`recovery_probes/probe-${requestId}`).get();
    assert.equal(probe.data().phase, 'cleanup-ready');
    const cleanupId = crypto.randomUUID();
    call(['--request-id', cleanupId, '--cleanup', '--probe-id', probe.id]);
    assert.equal((await db.collection('adminOperationLogs').get()).size, 7, 'cleanup dry-run must not write');
    call(['--request-id', cleanupId, '--cleanup', '--probe-id', probe.id, '--execute']);
    assert.equal((await db.doc(`recovery_probes/${probe.id}`).get()).exists, false);
    const allLogs = await db.collection('adminOperationLogs').get();
    assert.equal(allLogs.size, 9);
    assert.equal(allLogs.docs.filter((doc) => doc.data().action === 'recovery.fixture.cleanup').length, 2);
    callBootstrap([]);
    assert.equal((await db.doc('centers/centro-admin-local').get()).exists, false);
    callBootstrap(['--execute']);
    assert.equal((await db.doc('centers/centro-admin-local').get()).exists, true);
    const finalLogs = await db.collection('adminOperationLogs').get();
    assert.equal(finalLogs.size, 10);
    assert.equal(finalLogs.docs.filter((doc) => doc.data().action === 'platform_admin.bootstrap').length, 1);
    console.log(JSON.stringify({ ok: true, auditEvents: finalLogs.size, probeId: probe.id, cleaned: true }));
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
