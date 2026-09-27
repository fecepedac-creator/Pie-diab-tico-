const crypto = require('node:crypto');

const CANARY_PROJECT = 'pie-diabetico-canary-2026';
const DEMO_PROJECT = 'demo-pie-diabetico';

function options(argv, extra = []) {
  const allowed = new Set(['project', 'operator', 'ticket', 'purpose', 'request-id', 'execute', ...extra]);
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (!allowed.has(key) || Object.hasOwn(parsed, key)) throw new Error(`Argumento inválido o repetido: ${argv[i]}`);
    if (key === 'execute' || key === 'cleanup') parsed[key] = true;
    else {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`Falta valor para --${key}`);
      parsed[key] = value;
    }
  }
  if (![DEMO_PROJECT, CANARY_PROJECT].includes(parsed.project)) throw new Error('Usa --project demo-pie-diabetico o pie-diabetico-canary-2026; otros proyectos están bloqueados.');
  for (const envName of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT']) {
    if (process.env[envName] && process.env[envName] !== parsed.project) throw new Error(`${envName} no coincide con --project.`);
  }
  const emulatorHosts = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST'];
  if (parsed.project === DEMO_PROJECT) {
    if (!process.env.FIRESTORE_EMULATOR_HOST || !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST)) throw new Error('El proyecto demo requiere FIRESTORE_EMULATOR_HOST local.');
    for (const name of emulatorHosts) {
      if (process.env[name] && !/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[name])) throw new Error(`${name} debe ser local.`);
    }
  } else if (emulatorHosts.some((name) => process.env[name])) {
    throw new Error('El proyecto canary no puede mezclarse con emuladores.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.operator || '')) throw new Error('Usa --operator correo@institucion.cl.');
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{2,79}$/.test(parsed.ticket || '')) throw new Error('Usa --ticket identificador sin datos clínicos.');
  if (!/^[\p{L}\p{N} .,;:()_/-]{5,160}$/u.test(parsed.purpose || '')) throw new Error('Usa --purpose breve, sin datos clínicos ni secretos.');
  const requestId = parsed['request-id'] || crypto.randomUUID();
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) throw new Error('request-id inválido.');
  return {
    ...parsed,
    requestId,
    mode: parsed.execute ? 'execute' : 'dry-run',
    environment: parsed.project === DEMO_PROJECT ? 'emulator' : 'canary',
  };
}

function firestoreEvidence(snapshot) {
  return {
    exists: snapshot.exists,
    updateTime: snapshot.updateTime?.toDate().toISOString() || null,
  };
}

async function storageEvidence(file) {
  try {
    const [metadata] = await file.getMetadata();
    return {
      exists: true,
      generation: String(metadata.generation),
      metageneration: String(metadata.metageneration),
      sizeBytes: Number(metadata.size),
    };
  } catch (error) {
    if (String(error.code) === '404') return { exists: false };
    throw error;
  }
}

function safeEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Evidencia de auditoría inválida.');
  if (typeof value.exists === 'boolean') {
    const allowed = new Set(['exists', 'updateTime', 'generation', 'metageneration', 'sizeBytes']);
    if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('La evidencia sólo puede contener metadatos permitidos.');
    if (value.updateTime != null && (typeof value.updateTime !== 'string' || !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(value.updateTime))) throw new Error('updateTime inválido.');
    for (const key of ['generation', 'metageneration']) {
      if (value[key] != null && !/^\d{1,30}$/.test(String(value[key]))) throw new Error(`${key} inválido.`);
    }
    if (value.sizeBytes != null && (!Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 0)) throw new Error('sizeBytes inválido.');
    return value;
  }
  const allowed = new Set(['platformAdmin', 'center', 'membership']);
  if (Object.keys(value).length === 0 || Object.keys(value).some((key) => !allowed.has(key))) throw new Error('La evidencia compuesta contiene campos no permitidos.');
  for (const item of Object.values(value)) safeEvidence(item);
  return value;
}

function createAudit(db, config) {
  let sequence = 0;
  return async function run({ action, resource, readEvidence, mutate }) {
    if (!/^[a-z][a-z0-9_.-]{2,80}$/.test(action) || !/^[A-Za-z0-9_./-]{3,200}$/.test(resource)) throw new Error('Acción o recurso de auditoría inválido.');
    const before = safeEvidence(await readEvidence());
    const record = {
      projectId: config.project,
      environment: config.environment,
      actor: { suppliedEmail: config.operator, assurance: 'self_declared' },
      ticket: config.ticket,
      purpose: config.purpose,
      requestId: config.requestId,
      action,
      resource,
      before,
      startedAt: new Date().toISOString(),
    };
    if (config.mode === 'dry-run') {
      console.log(JSON.stringify({ ...record, result: 'dry_run', after: null }));
      return;
    }
    sequence += 1;
    const ref = db.doc(`adminOperationLogs/${config.requestId}-${String(sequence).padStart(3, '0')}`);
    await ref.create({ ...record, result: 'started' }); // Failure here prevents the mutation.
    let result = 'succeeded';
    let failure;
    try { await mutate(); } catch (error) { result = 'failed'; failure = error; }
    let after = null;
    try { after = safeEvidence(await readEvidence()); } catch (error) {
      result = 'verification_failed';
      failure ||= error;
    }
    try {
      const errorCode = /^[A-Za-z0-9_/-]{1,80}$/.test(String(failure?.code || '')) ? String(failure.code) : null;
      await ref.update({ result, after, finishedAt: new Date().toISOString(), errorCode });
    } catch (error) {
      throw new Error(`La operación ${ref.id} requiere conciliación: no se pudo cerrar su auditoría.`, { cause: error });
    }
    console.log(JSON.stringify({ requestId: config.requestId, auditId: ref.id, action, resource, result, before, after }));
    if (failure) throw failure;
  };
}

module.exports = { options, createAudit, firestoreEvidence, storageEvidence, CANARY_PROJECT, DEMO_PROJECT };
