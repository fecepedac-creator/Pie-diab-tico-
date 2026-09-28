const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { options, createAudit } = require('./admin-operation-audit.cjs');

function withEnv(values, work) {
  const names = ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST'];
  const old = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  for (const key of names) delete process.env[key];
  Object.assign(process.env, values);
  try { return work(); } finally {
    for (const key of names) {
      if (old[key] === undefined) delete process.env[key];
      else process.env[key] = old[key];
    }
  }
}

const common = ['--operator', 'operador@ejemplo.test', '--ticket', 'T6-123', '--purpose', 'Ensayo sintetico autorizado'];

test('recovery demo requires local Storage emulator and a UUID request ID', () => {
  const env = { ...process.env, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' };
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) delete env[key];
  const args = ['scripts/recovery-smoke.cjs', '--project', 'demo-pie-diabetico', '--bucket', 'demo-pie-diabetico.appspot.com', ...common, '--request-id', 'custom123'];
  const run = (variables) => spawnSync(process.execPath, args, { cwd: require('node:path').join(__dirname, '..'), env: { ...env, ...variables }, encoding: 'utf8' });
  const missing = run({});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /requiere FIREBASE_STORAGE_EMULATOR_HOST local/);
  const remote = run({ FIREBASE_STORAGE_EMULATOR_HOST: 'remote.example:9199' });
  assert.equal(remote.status, 1);
  assert.match(remote.stderr, /FIREBASE_STORAGE_EMULATOR_HOST debe ser local/);
  const badId = run({ FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199' });
  assert.equal(badId.status, 1);
  assert.match(badId.stderr, /requiere --request-id UUID/);
});

test('project selection rejects production, simulador and mismatched credentials', () => withEnv({}, () => {
  for (const project of ['policlinico-de-pie-diabetico', 'simulador-clinico', 'other-project']) {
    assert.throws(() => options(['--project', project, ...common]));
  }
  assert.throws(() => options(['--project', 'demo-pie-diabetico', ...common]));
  assert.equal(options(['--project', 'pie-diabetico-canary-2026', ...common]).mode, 'dry-run');
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
  assert.throws(() => options(['--project', 'pie-diabetico-canary-2026', ...common]));
}));

test('dry-run only reads evidence and does not write audit or data', async () => {
  const config = withEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, () => options(['--project', 'demo-pie-diabetico', ...common]));
  const run = createAudit({ doc: () => { throw new Error('Unexpected audit write'); } }, config);
  let mutations = 0;
  await run({ action: 'recovery.fixture.create', resource: 'recovery_probes/probe-test', readEvidence: async () => ({ exists: false }), mutate: () => { mutations += 1; } });
  assert.equal(mutations, 0);
});

test('audit start failure blocks mutation; success records before and after', async () => {
  const config = withEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, () => options(['--project', 'demo-pie-diabetico', ...common, '--execute']));
  let mutations = 0;
  const blocked = createAudit({ doc: () => ({ create: async () => { throw new Error('audit unavailable'); } }) }, config);
  await assert.rejects(blocked({ action: 'recovery.fixture.create', resource: 'recovery_probes/probe-test', readEvidence: async () => ({ exists: false }), mutate: () => { mutations += 1; } }), /audit unavailable/);
  assert.equal(mutations, 0);

  const audit = [];
  const db = { doc: () => ({
    id: 'test-001',
    create: async (value) => audit.push(value),
    update: async (value) => audit.push(value),
  }) };
  const run = createAudit(db, config);
  await run({ action: 'recovery.fixture.create', resource: 'recovery_probes/probe-test', readEvidence: async () => ({ exists: mutations > 0 }), mutate: () => { mutations += 1; } });
  assert.equal(mutations, 1);
  assert.equal(audit[0].result, 'started');
  assert.deepEqual(audit[0].before, { exists: false });
  assert.equal(audit[1].result, 'succeeded');
  assert.deepEqual(audit[1].after, { exists: true });
  assert.equal(audit[0].requestId, config.requestId);
});

test('clinical fields cannot enter audit evidence', async () => {
  const config = withEnv({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8085' }, () => options(['--project', 'demo-pie-diabetico', ...common, '--execute']));
  const run = createAudit({ doc: () => { throw new Error('Unexpected audit write'); } }, config);
  await assert.rejects(run({ action: 'recovery.fixture.create', resource: 'recovery_probes/probe-test', readEvidence: async () => ({ exists: true, patientName: 'No registrar' }), mutate: () => {} }), /metadatos permitidos/);
});
