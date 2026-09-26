const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { isValidRut } = require('./domain');

module.exports = async function verifyCandidate({ call, token, auth, db, centerId, idToken, tensToken, tensUid, now }) {
  const base = `/centers/${centerId}`;
  const rut = '87654321' + [...'0123456789K'].find((digit) => isValidRut('87654321' + digit));
  const attempts = await Promise.all([
    call(`${base}/patients`, idToken, 'POST', { name: 'Ingreso concurrente A', rut }),
    call(`${base}/patients`, idToken, 'POST', { name: 'Ingreso concurrente B', rut }),
  ]);
  assert.deepEqual(attempts.map((result) => result.response.status).sort(), [201, 409]);
  const created = attempts.find((result) => result.response.status === 201).payload.patient;
  const matches = await db.collection(`centers/${centerId}/patients`).where('rut', '==', rut).get();
  assert.equal(matches.size, 1);
  assert.equal((await db.doc(`centers/${centerId}/patientRuts/${rut}`).get()).data().patientId, created.id);
  const clinicalState = await call(`${base}/state`, idToken);
  assert(clinicalState.payload.patients.some((patient) => patient.id === created.id));
  const otherCenterId = `${centerId}-ajeno`;
  await db.doc(`centers/${otherCenterId}`).set({ id: otherCenterId, status: 'active' });
  assert.equal((await call(`/centers/${otherCenterId}/state`, idToken)).response.status, 403);
  assert.equal((await call(`/centers/${otherCenterId}/patients`, idToken, 'POST', { name: 'Cruce prohibido', rut })).response.status, 403);

  const deniedUnassigned = await call(`${base}/patients/${created.id}`, tensToken, 'PUT', { version: 1, anamnesis: { medicalHistory: ['Sin asignación'] } });
  assert.equal(deniedUnassigned.response.status, 403);
  const unassignedState = await call(`${base}/state`, tensToken);
  assert(!unassignedState.payload.patients.some((patient) => patient.id === created.id));
  assert.equal((await call(`${base}/episodes`, tensToken, 'POST', { patientId: created.id, side: 'left', location: 'Sin asignación' })).response.status, 403);
  assert.equal((await call(`${base}/patients/${created.id}/photo`, tensToken, 'POST', { dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' })).response.status, 403);
  assert.equal((await call(`${base}/patients/${created.id}`, tensToken, 'PUT', { version: 1, intakeAssignedToUid: tensUid })).response.status, 403);
  assert.equal((await call(`${base}/patients/${created.id}`, idToken, 'PUT', { version: 1, intakeAssignedToUid: 'cuenta-inactiva' })).response.status, 400);
  const availableTens = await call(`${base}/tens-members`, idToken);
  assert.equal(availableTens.response.status, 200);
  assert(availableTens.payload.members.some((person) => person.uid === tensUid));
  const assigned = await call(`${base}/patients/${created.id}`, idToken, 'PUT', { version: 1, intakeAssignedToUid: tensUid });
  assert.equal(assigned.response.status, 200, JSON.stringify(assigned.payload));
  assert.equal(assigned.payload.patient.intakeAssignedToUid, tensUid);
  const tensState = await call(`${base}/state`, tensToken);
  assert(tensState.payload.patients.some((patient) => patient.id === created.id));

  const tensDraft = await call(`${base}/patients/${created.id}`, tensToken, 'PUT', {
    version: 2,
    preAdmissionStatus: 'pending_validation',
    anamnesis: { medicalHistory: ['Antecedente sintético'], allergyStatus: 'unknown' },
    social: { notes: 'Apoyo por confirmar' },
    verification: { status: 'draft' },
    socialVerification: { status: 'draft' },
  });
  assert.equal(tensDraft.response.status, 200, JSON.stringify(tensDraft.payload));
  assert.equal(tensDraft.payload.patient.verification.status, 'draft');
  assert.equal(tensDraft.payload.patient.anamnesis.medicalHistory[0], 'Antecedente sintético');
  const tensValidate = await call(`${base}/patients/${created.id}`, tensToken, 'PUT', { version: 3, preAdmissionStatus: 'validated', verification: { status: 'confirmed' } });
  assert.equal(tensValidate.response.status, 403);

  const nurseValidate = await call(`${base}/patients/${created.id}`, idToken, 'PUT', { version: 3, preAdmissionStatus: 'validated', verification: { status: 'confirmed' } });
  assert.equal(nurseValidate.response.status, 200, JSON.stringify(nurseValidate.payload));
  assert.equal(nurseValidate.payload.patient.anamnesis.medicalHistory[0], 'Antecedente sintético');
  assert.equal(nurseValidate.payload.patient.social.notes, 'Apoyo por confirmar');
  const lockedTensEdit = await call(`${base}/patients/${created.id}`, tensToken, 'PUT', { version: 4, anamnesis: { medicalHistory: ['No permitido'] } });
  assert.equal(lockedTensEdit.response.status, 403);
  const identityOnly = await call(`${base}/patients/${created.id}`, idToken, 'PUT', { version: 4, contact: '+56 9 0000 0000' });
  assert.equal(identityOnly.response.status, 200);
  assert.equal(identityOnly.payload.patient.verification.status, 'confirmed');
  assert.equal(identityOnly.payload.patient.anamnesis.medicalHistory[0], 'Antecedente sintético');
  assert.equal((await call(`${base}/patients/${created.id}`, idToken, 'PUT', { version: 4, contact: 'Versión antigua' })).response.status, 409);

  const socialEmail = 'social.candidato@hospital.cl';
  const socialPassword = 'SyntheticOnly-9274!';
  const socialUser = await auth.createUser({ email: socialEmail, password: socialPassword, emailVerified: true, displayName: 'Social Sintética' });
  const socialHash = crypto.createHash('sha256').update(socialEmail).digest('hex');
  await db.doc(`memberships/${centerId}_${socialHash}`).set({ id: `${centerId}_${socialHash}`, centerId, uid: socialUser.uid, email: socialEmail, emailLower: socialEmail, displayName: 'Social Sintética', roles: ['social_worker'], status: 'active', createdAt: now, updatedAt: now });
  const socialToken = await token(socialEmail, socialPassword);
  const otherSocialEmail = 'social.otro@hospital.cl';
  const otherSocialPassword = 'SyntheticOnly-9275!';
  const otherSocialUser = await auth.createUser({ email: otherSocialEmail, password: otherSocialPassword, emailVerified: true });
  const otherSocialHash = crypto.createHash('sha256').update(otherSocialEmail).digest('hex');
  await db.doc(`memberships/${centerId}_${otherSocialHash}`).set({ id: `${centerId}_${otherSocialHash}`, centerId, uid: otherSocialUser.uid, email: otherSocialEmail, emailLower: otherSocialEmail, roles: ['social_worker'], status: 'active', createdAt: now, updatedAt: now });
  const otherSocialToken = await token(otherSocialEmail, otherSocialPassword);
  assert.equal((await call(`${base}/patients/${created.id}`, socialToken, 'PUT', { version: 5, social: { notes: 'Sin derivación' } })).response.status, 403);
  const episode = await call(`${base}/episodes`, idToken, 'POST', { patientId: created.id, side: 'left', location: 'Caso social sintético' });
  assert.equal(episode.response.status, 201);
  const referral = await call(`${base}/tasks`, idToken, 'POST', { patientId: created.id, episodeId: episode.payload.episode.id, recipientRole: 'social_worker', type: 'social', reason: 'Evaluación social sintética' });
  assert.equal(referral.response.status, 201);
  const unassignedSocialState = await call(`${base}/state`, socialToken);
  assert(!unassignedSocialState.payload.patients.some((patient) => patient.id === created.id));
  assert(!unassignedSocialState.payload.tasks.some((task) => task.id === referral.payload.task.id));
  assert.equal((await call(`${base}/patients/${created.id}`, socialToken, 'PUT', { version: 5, social: { notes: 'Sin responsable' } })).response.status, 403);
  assert.equal((await call(`${base}/tasks/${referral.payload.task.id}`, socialToken, 'PUT', { version: 1, status: 'accepted' })).response.status, 403);
  const assignedSocial = await call(`${base}/tasks/${referral.payload.task.id}`, idToken, 'PUT', { version: 1, assignedToUid: socialUser.uid });
  assert.equal(assignedSocial.response.status, 200, JSON.stringify(assignedSocial.payload));
  const otherSocialState = await call(`${base}/state`, otherSocialToken);
  assert(!otherSocialState.payload.patients.some((patient) => patient.id === created.id));
  assert.equal((await call(`${base}/patients/${created.id}`, otherSocialToken, 'PUT', { version: 5, social: { notes: 'Responsable ajeno' } })).response.status, 403);
  const socialState = await call(`${base}/state`, socialToken);
  assert.equal(socialState.response.status, 200);
  assert(socialState.payload.patients.some((patient) => patient.id === created.id));
  assert.equal(socialState.payload.patients.find((patient) => patient.id === created.id).anamnesis.medicalHistory.length, 0);
  const socialUpdate = await call(`${base}/patients/${created.id}`, socialToken, 'PUT', { version: 5, social: { notes: 'Visita social realizada' }, socialVerification: { status: 'confirmed' } });
  assert.equal(socialUpdate.response.status, 200, JSON.stringify(socialUpdate.payload));
  assert.equal(socialUpdate.payload.patient.socialVerification.status, 'confirmed');
  const stored = (await db.doc(`centers/${centerId}/patients/${created.id}`).get()).data();
  assert.equal(stored.socialVerification.status, 'confirmed');
  assert.equal(stored.verification.status, 'confirmed');
  const accepted = await call(`${base}/tasks/${referral.payload.task.id}`, socialToken, 'PUT', { version: 2, status: 'accepted' });
  assert.equal(accepted.response.status, 200);
  const resolved = await call(`${base}/tasks/${referral.payload.task.id}`, socialToken, 'PUT', { version: 3, status: 'resolved', result: 'Respuesta social sintética' });
  assert.equal(resolved.response.status, 200);
  const ended = await call(`${base}/state`, socialToken);
  assert.equal(ended.response.status, 200);
  assert(!ended.payload.patients.some((patient) => patient.id === created.id));
  assert.equal((await call(`${base}/patients/${created.id}`, socialToken, 'PUT', { version: 6, social: { notes: 'Caso cerrado' } })).response.status, 403);
  const events = await db.collection(`centers/${centerId}/auditLogs`).where('targetId', '==', created.id).get();
  assert.equal(events.size, 6);
  console.log('Candidata: RUT concurrente, borrador TENS, versiones, acceso social y auditoría verificados.');
};
