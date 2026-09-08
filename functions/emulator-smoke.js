const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const projectId = process.env.GCLOUD_PROJECT || 'demo-pie-diabetico';
const app = initializeApp({ projectId }); const auth = getAuth(app); const db = getFirestore(app);
const email = 'medico.prueba@hospital.cl'; const password = 'SyntheticOnly-4829!'; const centerId = 'centro-sintetico'; const hash = crypto.createHash('sha256').update(email).digest('hex');

async function token() {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) });
  const body = await response.json(); assert.equal(response.ok, true, JSON.stringify(body)); return body.idToken;
}

async function call(path, idToken, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:5002/api${path}`, { method, headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json(); return { response, payload };
}

(async () => {
  const user = await auth.createUser({ email, password, emailVerified: true, displayName: 'Profesional Sintético' }); const now = new Date().toISOString();
  await db.doc(`platform_admins/${hash}`).set({ emailLower: email, status: 'active', createdAt: now, updatedAt: now });
  await db.doc(`centers/${centerId}`).set({ id: centerId, name: 'Centro Sintético', code: 'SYN', allowedDomains: ['hospital.cl'], status: 'active', createdAt: now, updatedAt: now });
  await db.doc(`memberships/${centerId}_${hash}`).set({ id: `${centerId}_${hash}`, centerId, uid: user.uid, email, emailLower: email, displayName: 'Profesional Sintético', roles: ['doctor', 'nurse'], status: 'active', createdAt: now, updatedAt: now });
  const idToken = await token();
  const health = await call('/health', idToken); assert.equal(health.response.status, 200);
  const session = await call('/session', idToken); assert.equal(session.response.status, 200); assert.equal(session.payload.platformAdmin, true); assert.equal(session.payload.memberships[0].centerId, centerId);
  const brandedCenter = await call('/platform/centers', idToken, 'POST', { name: 'Centro con Identidad', code: 'LOGO-01', adminEmail: 'admin.logo@hospital.cl', logoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(brandedCenter.response.status, 201, JSON.stringify(brandedCenter.payload)); assert.match(brandedCenter.payload.center.logoStoragePath, /\/branding\/logo\.png$/);
  const publicLogo = await fetch(`http://127.0.0.1:5002${brandedCenter.payload.center.logoUrl}`); assert.equal(publicLogo.status, 200); assert.equal(publicLogo.headers.get('content-type'), 'image/png');
  const centerList = await call('/platform/centers', idToken); assert.equal(centerList.response.status, 200); assert(centerList.payload.centers.some((item) => item.id === brandedCenter.payload.center.id && item.logoStoragePath));
  const editedCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'PUT', { name: 'Centro Editado', code: 'EDIT-01', region: 'Maule', removeLogo: true }); assert.equal(editedCenter.response.status, 200, JSON.stringify(editedCenter.payload)); assert.equal(editedCenter.payload.center.name, 'Centro Editado'); assert.equal(editedCenter.payload.center.logoStoragePath, undefined);
  const archivedCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'DELETE'); assert.equal(archivedCenter.response.status, 200); assert.equal(archivedCenter.payload.center.status, 'archived');
  const restoredCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'PUT', { status: 'active' }); assert.equal(restoredCenter.response.status, 200); assert.equal(restoredCenter.payload.center.status, 'active');
  const patientResult = await call(`/centers/${centerId}/patients`, idToken, 'POST', { name: 'Paciente Sintético', rut: '123456785' }); assert.equal(patientResult.response.status, 201, JSON.stringify(patientResult.payload));
  const patientId = patientResult.payload.patient.id;
  const patientPhoto = await call(`/centers/${centerId}/patients/${patientId}/photo`, idToken, 'POST', { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(patientPhoto.response.status, 201, JSON.stringify(patientPhoto.payload)); assert.match(patientPhoto.payload.patient.photoStoragePath, new RegExp(`^centers/${centerId}/patients/${patientId}/profile/`));
  const duplicate = await call(`/centers/${centerId}/patients`, idToken, 'POST', { name: 'Duplicado', rut: '123456785' }); assert.equal(duplicate.response.status, 409);
  const episodeResult = await call(`/centers/${centerId}/episodes`, idToken, 'POST', { patientId, side: 'right', location: 'Plantar', priority: 'urgent', consentForPhotography: true }); assert.equal(episodeResult.response.status, 201, JSON.stringify(episodeResult.payload));
  const encounterResult = await call(`/centers/${centerId}/encounters`, idToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id }); assert.equal(encounterResult.response.status, 201, JSON.stringify(encounterResult.payload));
  const encounterId = encounterResult.payload.encounter.id;
  const woundResult = await call(`/centers/${centerId}/encounters/${encounterId}`, idToken, 'PUT', { version: 1, wound: { lengthCm: 2.4, widthCm: 1.2, depthCm: 0.3, granulationPercent: 80, edges: ['definidos'], periwound: ['macerada'], exposedStructures: [], infectionSigns: [], verification: { status: 'confirmed' } } }); assert.equal(woundResult.response.status, 200, JSON.stringify(woundResult.payload));
  const nursingResult = await call(`/centers/${centerId}/encounters/${encounterId}`, idToken, 'PUT', { version: 2, nursing: { cleaning: ['suero fisiológico'], debridement: ['cortante conservador'], primaryDressings: ['espuma'], secondaryDressings: [], periwoundProtection: ['barrera'], advancedTherapies: [], offloadingApplied: ['fieltro'], education: ['signos de alarma'], verification: { status: 'confirmed' } } }); assert.equal(nursingResult.response.status, 200, JSON.stringify(nursingResult.payload));
  const state = await call(`/centers/${centerId}/state`, idToken); assert.equal(state.response.status, 200); const shared = state.payload.encounters[0]; assert.equal(shared.wound.lengthCm, 2.4); assert.match(shared.nursingNarrative, /2.4 x 1.2 x 0.3 cm/); assert.match(shared.nursingNarrative, /suero fisiológico/); assert.match(state.payload.patients[0].photoStoragePath, /\/profile\//);
  const deniedLogs = await call(`/centers/${centerId}/audit`, idToken); assert.equal(deniedLogs.response.status, 403);
  await db.doc(`memberships/${centerId}_${hash}`).update({ roles: ['doctor', 'nurse', 'auditor'] });
  const logs = await call(`/centers/${centerId}/audit`, idToken); assert.equal(logs.response.status, 200); assert(logs.payload.events.length >= 5);
  const archivedClinicalCenter = await call(`/platform/centers/${centerId}`, idToken, 'DELETE'); assert.equal(archivedClinicalCenter.response.status, 200); assert.equal(archivedClinicalCenter.payload.center.status, 'archived');
  const blockedState = await call(`/centers/${centerId}/state`, idToken); assert.equal(blockedState.response.status, 403);
  const restoredClinicalCenter = await call(`/platform/centers/${centerId}`, idToken, 'PUT', { status: 'active' }); assert.equal(restoredClinicalCenter.response.status, 200);
  console.log(JSON.stringify({ ok: true, checks: 31, auditEvents: logs.payload.events.length }));
})().finally(() => deleteApp(app)).catch((error) => { console.error(error); process.exitCode = 1; });
