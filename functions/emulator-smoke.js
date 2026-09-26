const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const projectId = process.env.GCLOUD_PROJECT || 'demo-pie-diabetico';
const functionApiBase = process.env.PD_TEST_API_BASE || `/${projectId}/southamerica-west1/api`;
const app = initializeApp({ projectId }); const auth = getAuth(app); const db = getFirestore(app);
const email = 'medico.prueba@hospital.cl'; const password = 'SyntheticOnly-4829!'; const centerId = 'centro-sintetico'; const hash = crypto.createHash('sha256').update(email).digest('hex');

async function token(loginEmail = email, loginPassword = password) {
  const response = await fetch(`http://127.0.0.1:${process.env.PD_TEST_AUTH_PORT || 9099}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail, password: loginPassword, returnSecureToken: true }) });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch {
    throw Object.assign(new Error(`Respuesta no-JSON al autenticar ${loginEmail}: ${raw}`), { status: 500 });
  }
  assert.equal(response.ok, true, JSON.stringify(body));
  return body.idToken;
}

async function call(path, idToken, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${process.env.PD_TEST_API_PORT || 5001}${functionApiBase}${path}`, { method, headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  let payload;
  try { payload = JSON.parse(raw); } catch {
    throw Object.assign(new Error(`Respuesta no-JSON en ${method} ${path}: ${raw.slice(0, 200)}`), { status: 500 });
  }
  return { response, payload };
}

async function callNoAuth(path, method = 'GET', body) {
  const response = await fetch(`http://127.0.0.1:${process.env.PD_TEST_API_PORT || 5001}${functionApiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { error: raw.slice(0, 200) };
  }
  return { response, payload };
}

async function callNoAuthWithHeaders(path, method = 'GET', body, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${process.env.PD_TEST_API_PORT || 5001}${functionApiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { error: raw.slice(0, 200) };
  }
  return { response, payload };
}

(async () => {
  const user = await auth.createUser({ email, password, emailVerified: true, displayName: 'Profesional Sintético' }); const now = new Date().toISOString();
  await db.doc(`platform_admins/${hash}`).set({ emailLower: email, status: 'active', createdAt: now, updatedAt: now });
  await db.doc(`centers/${centerId}`).set({ id: centerId, name: 'Centro Sintético', code: 'SYN', allowedDomains: ['hospital.cl'], status: 'active', createdAt: now, updatedAt: now });
  await db.doc(`memberships/${centerId}_${hash}`).set({ id: `${centerId}_${hash}`, centerId, uid: user.uid, email, emailLower: email, displayName: 'Profesional Sintético', roles: ['doctor', 'nurse'], status: 'active', createdAt: now, updatedAt: now });
  const idToken = await token();
  const health = await call('/health', idToken); assert.equal(health.response.status, 200);
  const session = await call('/session', idToken); assert.equal(session.response.status, 200); assert.equal(session.payload.platformAdmin, true); assert.equal(session.payload.memberships[0].centerId, centerId);
  const unauthSession = await callNoAuth('/session'); assert.equal(unauthSession.response.status, 401);
  assert.equal(typeof unauthSession.payload.requestId, 'string');
  assert.match(unauthSession.payload.requestId, /^[0-9a-f-]{36}$/);
  assert.equal(typeof unauthSession.payload.code, 'string');
  assert.equal(unauthSession.payload.code, 'validation_or_authorization_error');
  const invalidTokenSession = await callNoAuth('/session', 'GET', undefined);
  assert.equal(invalidTokenSession.response.status, 401);
  const forcedInvalidToken = await fetch(`http://127.0.0.1:${process.env.PD_TEST_API_PORT || 5001}${functionApiBase}/session`, {
    method: 'GET',
    headers: { Authorization: 'Bearer not-a-token', 'Content-Type': 'application/json' },
  });
  assert.equal(forcedInvalidToken.status, 401);
  const corsAllowedOrigin = await callNoAuthWithHeaders('/centers/centro-sintetico/state', 'OPTIONS', undefined, { Origin: 'https://hospital.cl' });
  assert.equal(corsAllowedOrigin.response.status, 204);
  assert.equal(corsAllowedOrigin.response.headers.get('access-control-allow-origin'), 'https://hospital.cl');
  const corsNoOrigin = await callNoAuthWithHeaders('/health', 'OPTIONS', undefined);
  assert.equal(corsNoOrigin.response.status, 204);
  assert.equal(corsNoOrigin.response.headers.get('access-control-allow-origin'), null);
  const brandedCenter = await call('/platform/centers', idToken, 'POST', { name: 'Centro con Identidad', code: 'LOGO-01', adminEmail: 'admin.logo@hospital.cl', logoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(brandedCenter.response.status, 201, JSON.stringify(brandedCenter.payload)); assert.match(brandedCenter.payload.center.logoStoragePath, /\/branding\/logo\.png$/);
  const logoPath = String(brandedCenter.payload.center.logoUrl || '').replace(/^\/api/, functionApiBase);
  const publicLogo = await fetch(`http://127.0.0.1:${process.env.PD_TEST_API_PORT || 5001}${logoPath}`); assert.equal(publicLogo.status, 200); assert.equal(publicLogo.headers.get('content-type'), 'image/png');
  const centerList = await call('/platform/centers', idToken); assert.equal(centerList.response.status, 200); assert(centerList.payload.centers.some((item) => item.id === brandedCenter.payload.center.id && item.logoStoragePath));
  const editedCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'PUT', { name: 'Centro Editado', code: 'EDIT-01', region: 'Maule', removeLogo: true }); assert.equal(editedCenter.response.status, 200, JSON.stringify(editedCenter.payload)); assert.equal(editedCenter.payload.center.name, 'Centro Editado'); assert.equal(editedCenter.payload.center.logoStoragePath, undefined);
  const archivedCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'DELETE'); assert.equal(archivedCenter.response.status, 200); assert.equal(archivedCenter.payload.center.status, 'archived');
  const restoredCenter = await call(`/platform/centers/${brandedCenter.payload.center.id}`, idToken, 'PUT', { status: 'active' }); assert.equal(restoredCenter.response.status, 200); assert.equal(restoredCenter.payload.center.status, 'active');
  const patientResult = await call(`/centers/${centerId}/patients`, idToken, 'POST', { name: 'Paciente Sintético', rut: '123456785' }); assert.equal(patientResult.response.status, 201, JSON.stringify(patientResult.payload));
  const patientId = patientResult.payload.patient.id;
  const patientPhoto = await call(`/centers/${centerId}/patients/${patientId}/photo`, idToken, 'POST', { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(patientPhoto.response.status, 201, JSON.stringify(patientPhoto.payload)); assert.match(patientPhoto.payload.patient.photoStoragePath, new RegExp(`^centers/${centerId}/patients/${patientId}/profile/`));
  const updatedPatient = await call(`/centers/${centerId}/patients/${patientId}`, idToken, 'PUT', { version: 1, preAdmissionStatus: 'validated', verification: { status: 'confirmed' }, anamnesis: { medicalHistory: ['DM-2', 'HTA'], medicalHistoryDetails: { 'DM-2': ['Diagnóstico hace aproximadamente 10 años'], extra: ['No debe persistir'] }, surgicalHistory: ['Amputación menor'], surgicalHistoryDetails: { 'Amputación menor': ['1.er ortejo derecho, 2001', '2.º ortejo derecho, 2003'] }, allergyStatus: 'none', allergies: [], medications: ['Metformina'], smoking: 'Exfumador/a', alcoholUse: 'Ocasional', alcoholDetails: '1 a 2 unidades por semana', substanceUse: 'Nunca', renalDisease: 'Sin ERC conocida' }, social: {} }); assert.equal(updatedPatient.response.status, 200, JSON.stringify(updatedPatient.payload)); assert.deepEqual(updatedPatient.payload.patient.anamnesis.medicalHistoryDetails, { 'DM-2': ['Diagnóstico hace aproximadamente 10 años'] });
  const duplicate = await call(`/centers/${centerId}/patients`, idToken, 'POST', { name: 'Duplicado', rut: '123456785' }); assert.equal(duplicate.response.status, 409);
  const episodeResult = await call(`/centers/${centerId}/episodes`, idToken, 'POST', { patientId, side: 'right', location: 'Plantar', priority: 'urgent', consentForPhotography: true }); assert.equal(episodeResult.response.status, 201, JSON.stringify(episodeResult.payload));
  const encounterResult = await call(`/centers/${centerId}/encounters`, idToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id }); assert.equal(encounterResult.response.status, 201, JSON.stringify(encounterResult.payload));
  const encounterId = encounterResult.payload.encounter.id;
  const encounterPhoto = await call(`/centers/${centerId}/encounters/${encounterId}/photos`, idToken, 'POST', { kind: 'pre', orientationConfirmed: true, scaleIncluded: true, dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(encounterPhoto.response.status, 201, JSON.stringify(encounterPhoto.payload));
  const woundResult = await call(`/centers/${centerId}/encounters/${encounterId}`, idToken, 'PUT', { version: 2, wound: { lengthCm: 2.4, widthCm: 1.2, depthCm: 0.3, granulationPercent: 80, edges: ['definidos'], periwound: ['macerada'], exposedStructures: [], infectionSigns: [], verification: { status: 'confirmed' } } }); assert.equal(woundResult.response.status, 200, JSON.stringify(woundResult.payload));
  const nursingResult = await call(`/centers/${centerId}/encounters/${encounterId}`, idToken, 'PUT', { version: 3, nursing: { cleaning: ['suero fisiológico'], debridement: ['cortante conservador'], primaryDressings: ['espuma'], secondaryDressings: [], periwoundProtection: ['barrera'], advancedTherapies: [], offloadingApplied: ['fieltro'], education: ['signos de alarma'], verification: { status: 'confirmed' } } }); assert.equal(nursingResult.response.status, 200, JSON.stringify(nursingResult.payload));
  const state = await call(`/centers/${centerId}/state`, idToken); assert.equal(state.response.status, 200); const shared = state.payload.encounters[0]; const sharedPatient = state.payload.patients.find((item) => item.id === patientId); assert.equal(shared.wound.lengthCm, 2.4); assert.match(shared.nursingNarrative, /2.4 x 1.2 x 0.3 cm/); assert.match(shared.nursingNarrative, /suero fisiológico/); assert.match(sharedPatient.photoStoragePath, /\/profile\//); assert.equal(sharedPatient.anamnesis.surgicalHistoryDetails['Amputación menor'].length, 2); assert.equal(sharedPatient.anamnesis.alcoholUse, 'Ocasional');
  const tensEmail = 'tens.prueba@hospital.cl'; const tensPassword = 'SyntheticOnly-5830!'; const tensUser = await auth.createUser({ email: tensEmail, password: tensPassword, emailVerified: true, displayName: 'TENS Sintética' }); const tensHash = crypto.createHash('sha256').update(tensEmail).digest('hex'); await db.doc(`memberships/${centerId}_${tensHash}`).set({ id: `${centerId}_${tensHash}`, centerId, uid: tensUser.uid, email: tensEmail, emailLower: tensEmail, displayName: 'TENS Sintética', roles: ['tens'], status: 'active', createdAt: now, updatedAt: now }); const tensToken = await token(tensEmail, tensPassword);
  const assignedMainPatient = await call(`/centers/${centerId}/patients/${patientId}`, idToken, 'PUT', { version: updatedPatient.payload.patient.version, intakeAssignedToUid: tensUser.uid }); assert.equal(assignedMainPatient.response.status, 200);
  await require('./candidate-emulator-checks')({ call, token, auth, db, centerId, idToken, tensToken, tensUid: tensUser.uid, now });
  const tensState = await call(`/centers/${centerId}/state`, tensToken); assert.equal(tensState.response.status, 200); assert.equal(tensState.payload.tasks.length, 0); assert.equal(tensState.payload.attachments.length, 0); assert.equal(tensState.payload.encounters[0].wound.lengthCm, undefined); assert.equal(tensState.payload.encounters[0].photos.length, 1);
  const tensDraft = await call(`/centers/${centerId}/patients/${patientId}`, tensToken, 'PUT', { version: updatedPatient.payload.patient.version, preAdmissionStatus: 'validated', anamnesis: sharedPatient.anamnesis, social: sharedPatient.social, verification: { status: 'confirmed' } }); assert.equal(tensDraft.response.status, 403);
  const tensDeniedWound = await call(`/centers/${centerId}/encounters/${encounterId}`, tensToken, 'PUT', { version: nursingResult.payload.encounter.version, wound: { lengthCm: 9 } }); assert.equal(tensDeniedWound.response.status, 403);
  const referral = await call(`/centers/${centerId}/tasks`, idToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id, encounterId, type: 'vascular', recipientRole: 'vascular_surgeon', title: 'Evaluación vascular sintética', reason: 'Revisar perfusión', priority: 'soon' }); assert.equal(referral.response.status, 201, JSON.stringify(referral.payload));
  const duplicateReferral = await call(`/centers/${centerId}/tasks`, idToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id, encounterId, type: 'vascular', recipientRole: 'vascular_surgeon', title: 'Evaluación vascular sintética', reason: 'Revisar perfusión', priority: 'soon' }); assert.equal(duplicateReferral.response.status, 409);
  const specialistEmail = 'vascular.prueba@hospital.cl'; const specialistPassword = 'SyntheticOnly-6941!'; const specialistUser = await auth.createUser({ email: specialistEmail, password: specialistPassword, emailVerified: true, displayName: 'Especialista Sintético' }); const specialistHash = crypto.createHash('sha256').update(specialistEmail).digest('hex'); await db.doc(`memberships/${centerId}_${specialistHash}`).set({ id: `${centerId}_${specialistHash}`, centerId, uid: specialistUser.uid, email: specialistEmail, emailLower: specialistEmail, displayName: 'Especialista Sintético', roles: ['vascular_surgeon'], status: 'active', createdAt: now, updatedAt: now }); const specialistToken = await token(specialistEmail, specialistPassword);
  const otherSpecialistEmail = 'vascular.otro@hospital.cl'; const otherSpecialistPassword = 'SyntheticOnly-6942!'; const otherSpecialistUser = await auth.createUser({ email: otherSpecialistEmail, password: otherSpecialistPassword, emailVerified: true }); const otherSpecialistHash = crypto.createHash('sha256').update(otherSpecialistEmail).digest('hex'); await db.doc(`memberships/${centerId}_${otherSpecialistHash}`).set({ id: `${centerId}_${otherSpecialistHash}`, centerId, uid: otherSpecialistUser.uid, email: otherSpecialistEmail, emailLower: otherSpecialistEmail, roles: ['vascular_surgeon'], status: 'active', createdAt: now, updatedAt: now }); const otherSpecialistToken = await token(otherSpecialistEmail, otherSpecialistPassword);
  const invalidAssignee = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, idToken, 'PUT', { version: 1, assignedToUid: 'cuenta-ajena' }); assert.equal(invalidAssignee.response.status, 400);
  const assignedReferral = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, idToken, 'PUT', { version: 1, assignedToUid: specialistUser.uid }); assert.equal(assignedReferral.response.status, 200);
  const otherSpecialistState = await call(`/centers/${centerId}/state`, otherSpecialistToken); assert.equal(otherSpecialistState.response.status, 200); assert.equal(otherSpecialistState.payload.encounters.length, 0);
  const specialistState = await call(`/centers/${centerId}/state`, specialistToken); assert.equal(specialistState.response.status, 200); assert.equal(specialistState.payload.patients.length, 1); assert.equal(specialistState.payload.tasks.length, 1); assert.equal(specialistState.payload.encounters[0].wound.lengthCm, 2.4);
  const specialistDeniedWound = await call(`/centers/${centerId}/encounters/${encounterId}`, specialistToken, 'PUT', { version: nursingResult.payload.encounter.version, wound: { lengthCm: 8 } }); assert.equal(specialistDeniedWound.response.status, 403);
  const specialistDeniedTask = await call(`/centers/${centerId}/tasks`, specialistToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id, type: 'other', recipientRole: 'doctor', reason: 'No debe crearse' }); assert.equal(specialistDeniedTask.response.status, 403);
  const specialistAttachment = await call(`/centers/${centerId}/episodes/${episodeResult.payload.episode.id}/attachments`, specialistToken, 'POST', { kind: 'pvr', title: 'PVR sintético', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(specialistAttachment.response.status, 201, JSON.stringify(specialistAttachment.payload));
  const unassignedEpisode = await call(`/centers/${centerId}/episodes`, idToken, 'POST', { patientId, side: 'left', location: 'Hallux', priority: 'routine', consentForPhotography: false }); assert.equal(unassignedEpisode.response.status, 201);
  const specialistDeniedAttachment = await call(`/centers/${centerId}/episodes/${unassignedEpisode.payload.episode.id}/attachments`, specialistToken, 'POST', { kind: 'pvr', title: 'No autorizado', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }); assert.equal(specialistDeniedAttachment.response.status, 403);
  const prematureResolution = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, specialistToken, 'PUT', { version: 2, status: 'resolved', result: 'No debe aceptarse' }); assert.equal(prematureResolution.response.status, 409);
  const acceptedReferral = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, specialistToken, 'PUT', { version: 2, status: 'accepted' }); assert.equal(acceptedReferral.response.status, 200); assert.equal(acceptedReferral.payload.task.assignedToUid, specialistUser.uid);
  const staleTaskUpdate = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, specialistToken, 'PUT', { version: 2, status: 'in_progress' }); assert.equal(staleTaskUpdate.response.status, 409);
  const specialistResponse = await call(`/centers/${centerId}/tasks/${referral.payload.task.id}`, specialistToken, 'PUT', { version: 3, status: 'resolved', result: 'Conducta vascular sintética' }); assert.equal(specialistResponse.response.status, 200); assert.equal(specialistResponse.payload.task.status, 'resolved');
  const endedReferralAccess = await call(`/centers/${centerId}/state`, specialistToken); assert.equal(endedReferralAccess.response.status, 200); assert.equal(endedReferralAccess.payload.encounters.length, 0);
  const coordinatorEmail = 'coordinacion.prueba@hospital.cl'; const coordinatorPassword = 'SyntheticOnly-7052!'; const coordinatorUser = await auth.createUser({ email: coordinatorEmail, password: coordinatorPassword, emailVerified: true, displayName: 'Coordinación Sintética' }); const coordinatorHash = crypto.createHash('sha256').update(coordinatorEmail).digest('hex'); await db.doc(`memberships/${centerId}_${coordinatorHash}`).set({ id: `${centerId}_${coordinatorHash}`, centerId, uid: coordinatorUser.uid, email: coordinatorEmail, emailLower: coordinatorEmail, displayName: 'Coordinación Sintética', roles: ['coordinator'], status: 'active', createdAt: now, updatedAt: now }); const coordinatorToken = await token(coordinatorEmail, coordinatorPassword); const coordinatorState = await call(`/centers/${centerId}/state`, coordinatorToken); assert.equal(coordinatorState.response.status, 200); assert.equal(coordinatorState.payload.encounters.length, 0); assert.equal(coordinatorState.payload.patients[0].anamnesis.medicalHistory.length, 0); const coordinatorDeniedEncounter = await call(`/centers/${centerId}/encounters`, coordinatorToken, 'POST', { patientId, episodeId: episodeResult.payload.episode.id }); assert.equal(coordinatorDeniedEncounter.response.status, 403);
  const auditorEmail = 'auditoria.prueba@hospital.cl'; const auditorPassword = 'SyntheticOnly-8163!'; const auditorUser = await auth.createUser({ email: auditorEmail, password: auditorPassword, emailVerified: true, displayName: 'Auditor Sintético' }); const auditorHash = crypto.createHash('sha256').update(auditorEmail).digest('hex'); await db.doc(`memberships/${centerId}_${auditorHash}`).set({ id: `${centerId}_${auditorHash}`, centerId, uid: auditorUser.uid, email: auditorEmail, emailLower: auditorEmail, displayName: 'Auditor Sintético', roles: ['auditor'], status: 'active', createdAt: now, updatedAt: now }); const auditorToken = await token(auditorEmail, auditorPassword); const auditorState = await call(`/centers/${centerId}/state`, auditorToken); assert.equal(auditorState.response.status, 403);
  const deniedLogs = await call(`/centers/${centerId}/audit`, idToken); assert.equal(deniedLogs.response.status, 403);
  await db.doc(`memberships/${centerId}_${hash}`).update({ roles: ['doctor', 'nurse', 'auditor'] });
  const logs = await call(`/centers/${centerId}/audit`, idToken); assert.equal(logs.response.status, 200); assert(logs.payload.events.length >= 5);
  await require('./clinical-emulator-checks')({ call, idToken, tensToken, specialistToken, centerId, patientId, episodeId: episodeResult.payload.episode.id, encounterId });
  await require('./admin-emulator-checks')({ call, idToken, centerId, db, hash });
  const archivedClinicalCenter = await call(`/platform/centers/${centerId}`, idToken, 'DELETE'); assert.equal(archivedClinicalCenter.response.status, 200); assert.equal(archivedClinicalCenter.payload.center.status, 'archived');
  const blockedState = await call(`/centers/${centerId}/state`, idToken); assert.equal(blockedState.response.status, 403);
  const restoredClinicalCenter = await call(`/platform/centers/${centerId}`, idToken, 'PUT', { status: 'active' }); assert.equal(restoredClinicalCenter.response.status, 200);
  console.log(JSON.stringify({ ok: true, baselineChecks: 61, candidateScenarios: ['concurrent-rut', 'tens-draft', 'patient-version', 'social-assignment', 'task-assignment', 'task-lifecycle', 'atomic-audit'], auditEvents: logs.payload.events.length }));
})().finally(() => deleteApp(app)).catch((error) => { console.error(error); process.exitCode = 1; });
