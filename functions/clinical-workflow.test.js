const test = require('node:test');
const assert = require('node:assert/strict');
const w = require('./clinical-workflow');
const d = require('./domain');
const encounter = () => ({ id: 'e', episodeId: 'ep', patientId: 'p', status: 'in_progress', version: 1, photos: [], wound: d.emptyWound(), nursing: d.emptyNursing(), medical: d.emptyMedical(), wifi: d.emptyWifi() });
test('photo-only encounter omits narratives and minimal patient omits clinical history', () => {
  const source = { ...encounter(), medicalNarrative: 'secret', addenda: [{ text: 'secret' }] };
  const visible = w.photoOnlyEncounter(source);
  assert.equal(visible.medicalNarrative, undefined); assert.equal(visible.addenda, undefined);
  const patient = w.minimalPatient({ id: 'p', anamnesis: { secret: true }, photoUrl: 'private', unknownClinicalField: 'secret' });
  assert.equal(patient.unknownClinicalField, undefined); assert.equal(patient.photoUrl, undefined);
});
test('TENS sees intake fields while case permissions still hide the medical encounter', () => {
  const state = { patients: [{ id: 'p', intakeAssignedToUid: 'tens-1', anamnesis: { medicalHistory: ['dato'] }, social: {}, verification: { status: 'draft' } }], episodes: [{ id: 'ep', patientId: 'p' }], encounters: [{ ...encounter(), medicalNarrative: 'privado' }], tasks: [], attachments: [] };
  const visible = w.projectState({ uid: 'tens-1', roles: ['tens'] }, state);
  assert.deepEqual(visible.patients[0].anamnesis.medicalHistory, ['dato']);
  assert.equal(visible.encounters[0].medicalNarrative, undefined);
  assert.equal(w.projectState({ uid: 'tens-2', roles: ['tens'] }, state).patients.length, 0);
});
test('assigned and closed derivations do not grant another specialist case access', () => {
  const member = { uid: 'medico-1', roles: ['vascular_surgeon'] };
  const task = { recipientRole: 'vascular_surgeon', status: 'created' };
  assert.equal(w.taskGrantsAccess(task, member), true);
  assert.equal(w.taskGrantsAccess({ ...task, assignedToUid: 'medico-2' }, member), false);
  assert.equal(w.taskGrantsAccess({ ...task, status: 'resolved' }, member), false);
  assert.throws(() => w.assertTaskTransition('created', 'resolved'));
  assert.doesNotThrow(() => w.assertTaskTransition('accepted', 'resolved'));
});
test('social access requires a named active assignee', () => {
  const member = { uid: 'social-1', roles: ['social_worker'] };
  const task = { id: 't', patientId: 'p', episodeId: 'ep', recipientRole: 'social_worker', status: 'created' };
  const state = { patients: [{ id: 'p', social: { notes: 'privado' } }], episodes: [{ id: 'ep', patientId: 'p' }], encounters: [], tasks: [task], attachments: [] };
  assert.equal(w.taskGrantsAccess(task, member), false);
  assert.equal(w.projectState(member, state).patients.length, 0);
  assert.equal(w.taskGrantsAccess({ ...task, assignedToUid: 'social-1' }, member), true);
  assert.equal(w.taskGrantsAccess({ ...task, assignedToUid: 'social-2' }, member), false);
  assert.equal(w.taskGrantsAccess({ ...task, assignedToUid: 'social-1', status: 'resolved' }, member), false);
});
test('combined roles preserve referral access only on assigned episodes', () => {
  const state = { patients: [{ id: 'p', anamnesis: { secret: true } }], episodes: [{ id: 'ep', patientId: 'p' }, { id: 'other', patientId: 'p' }], encounters: [{ ...encounter(), medicalNarrative: 'authorized' }, { ...encounter(), id: 'e2', episodeId: 'other', medicalNarrative: 'private' }], tasks: [{ id: 't', patientId: 'p', episodeId: 'ep', recipientRole: 'vascular_surgeon' }], attachments: [{ episodeId: 'ep' }, { episodeId: 'other' }] };
  const projected = w.projectState({ roles: ['tens', 'vascular_surgeon'] }, state);
  assert.equal(projected.encounters[0].medicalNarrative, 'authorized'); assert.equal(projected.encounters.length, 1); assert.equal(projected.attachments.length, 1);
});
test('coordinator tasks exclude clinical free text and snapshot', () => {
  const result = w.operationalTask({ version: 3, reason: 'secret', result: 'secret', title: 'diagnosis', referralSnapshot: { text: 'secret' } });
  assert.equal(result.version, 3);
  assert.equal(result.result, undefined); assert.equal(result.referralSnapshot, undefined); assert.equal(result.reason, ''); assert.notEqual(result.title, 'diagnosis');
});
test('missing and coerced WIfI values are not grade zero', () => {
  for (const input of [undefined, null, '', false, '0', 1.5, 4]) assert.equal(w.grade(input), undefined);
  assert.equal(w.grade(0), 0);
});
test('closure depends on care type and closed encounters reject mutation', () => {
  const e = { ...encounter(), careType: 'nursing' };
  assert.throws(() => w.assertComplete(e));
  e.wound.verification.status = 'confirmed'; e.nursing.verification.status = 'confirmed'; w.assertComplete(e);
  e.careType = 'joint'; assert.throws(() => w.assertComplete(e));
  assert.throws(() => w.assertMutable({ status: 'completed' })); assert.throws(() => w.assertMutable({ status: 'cancelled' }));
});
test('empty confirmations and contradictory procedures fail validation', () => {
  assert.throws(() => w.validateSection('nursing', { ...d.emptyNursing(), verification: { status: 'confirmed' } }));
  assert.throws(() => w.validateSection('nursing', { ...d.emptyNursing(), debridement: ['No realizado', 'Quirúrgico'] }));
  assert.throws(() => w.validateSection('wound', { ...d.emptyWound(), granulationPercent: 80, necrosisPercent: 30 }));
  assert.throws(() => w.validateSection('wifi', { ...d.emptyWifi(), wound: 1, verification: { status: 'confirmed' } }));
});
test('draft stamps no longer retain a current confirmation', () => {
  const stamp = d.stamp({ uid: 'u', name: 'N' }, 'draft', { confirmedAt: 'yesterday', confirmedByName: 'old' });
  assert.equal(stamp.confirmedAt, null); assert.equal(w.invalidate(stamp).status, 'draft');
});
test('empty nursing narrative does not assert a performed cleaning', () => {
  const text = d.nursingNarrative(encounter()); assert.doesNotMatch(text, /Se realiza/); assert.match(text, /borrador/);
});
test('vincula sólo lesiones distintas del mismo paciente en una visita reciente', () => {
  const now = Date.parse('2026-09-24T15:00:00Z');
  const linked = { patientId: 'p1', episodeId: 'lesion-1', encounterDate: '2026-09-24T14:00:00Z', status: 'in_progress' };
  w.assertVisitLink(linked, 'p1', 'lesion-2', now);
  assert.throws(() => w.assertVisitLink(linked, 'p2', 'lesion-2', now));
  assert.throws(() => w.assertVisitLink(linked, 'p1', 'lesion-1', now));
  assert.throws(() => w.assertVisitLink({ ...linked, encounterDate: '2026-09-22T14:00:00Z' }, 'p1', 'lesion-2', now));
  assert.throws(() => w.assertVisitLink({ ...linked, status: 'cancelled' }, 'p1', 'lesion-2', now));
});
