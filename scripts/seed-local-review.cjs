const crypto = require('node:crypto');

const projectId = 'demo-pie-diabetico';
if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== projectId) throw new Error('Sólo se permite el proyecto demo local.');
for (const [key, expected] of [['FIRESTORE_EMULATOR_HOST', '127.0.0.1:8085'], ['FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1:9099']]) {
  if (process.env[key] && process.env[key] !== expected) throw new Error(`${key} debe apuntar al emulador local ${expected}.`);
  process.env[key] = expected;
}
process.env.GCLOUD_PROJECT = projectId;

const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { emptyWound, emptyWifi, emptyNursing, emptyMedical } = require('../functions/domain');

initializeApp({ projectId });
const auth = getAuth();
const db = getFirestore();
const centerId = 'centro-revision-local';
const patientId = 'paciente-ficticio';
const episodeId = 'episodio-pie-derecho';
const password = 'SyntheticOnly-PD-Review!';
const accounts = [
  { email: 'tens@ejemplo.test', name: 'TENS de prueba', roles: ['tens'] },
  { email: 'enfermeria@ejemplo.test', name: 'Enfermería de prueba', roles: ['nurse'] },
  { email: 'medicina@ejemplo.test', name: 'Medicina de prueba', roles: ['doctor'] },
];

async function createIfAbsent(ref, value) {
  if (!(await ref.get()).exists) await ref.create(value);
}

async function main() {
  const now = new Date().toISOString();
  const members = {};
  for (const account of accounts) {
    let user;
    try { user = await auth.getUserByEmail(account.email); }
    catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      user = await auth.createUser({ email: account.email, password, emailVerified: true, displayName: account.name });
    }
    const memberId = `${centerId}_${crypto.createHash('sha256').update(account.email).digest('hex')}`;
    await db.doc(`memberships/${memberId}`).set({ id: memberId, centerId, uid: user.uid, email: account.email, emailLower: account.email, displayName: account.name, roles: account.roles, status: 'active', updatedAt: now, createdAt: now });
    members[account.roles[0]] = user.uid;
  }

  await db.doc(`centers/${centerId}`).set({ id: centerId, name: 'Centro de prueba local', code: 'DEMO', allowedDomains: ['ejemplo.test'], status: 'active', updatedAt: now, createdAt: now }, { merge: true });
  await createIfAbsent(db.doc(`centers/${centerId}/patients/${patientId}`), {
    id: patientId, centerId, rut: '123456785', name: 'Paciente ficticio de prueba', birthDate: '1962-04-18', contact: '+56 9 0000 0000', comuna: 'Comuna ficticia',
    intakeAssignedToUid: members.tens, preAdmissionStatus: 'validated', version: 1,
    anamnesis: { medicalHistory: ['Diabetes mellitus'], medicalHistoryDetails: {}, surgicalHistory: [], surgicalHistoryDetails: {}, allergyStatus: 'unknown', allergies: [], medications: [] },
    social: {}, verification: { status: 'confirmed', confirmedByUid: members.nurse, confirmedByName: 'Enfermería de prueba', confirmedAt: now }, socialVerification: { status: 'draft' },
    createdAt: now, updatedAt: now,
  });
  await createIfAbsent(db.doc(`centers/${centerId}/episodes/${episodeId}`), {
    id: episodeId, centerId, patientId, side: 'right', location: 'Plantar antepié', onsetDate: '2026-09-01', status: 'active', priority: 'routine', consentForPhotography: true, createdAt: now, updatedAt: now,
  });
  await createIfAbsent(db.doc(`centers/${centerId}/encounters/atencion-anterior`), {
    id: 'atencion-anterior', centerId, patientId, episodeId, careType: 'joint', encounterDate: '2026-09-10T12:00:00.000Z', status: 'in_progress', version: 1,
    wound: emptyWound(), wifi: emptyWifi(), nursing: emptyNursing(), medical: emptyMedical(), photos: [],
    nursingNarrative: 'Registro previo ficticio.', medicalNarrative: 'Registro previo ficticio.', createdAt: now, updatedAt: now,
  });
  console.log(JSON.stringify({ ok: true, projectId, centerId, patientId, episodeId, roles: accounts.map(({ roles }) => roles[0]) }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
