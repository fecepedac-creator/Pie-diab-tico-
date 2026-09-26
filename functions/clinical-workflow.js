const { emptyWound, emptyWifi, emptyNursing, emptyMedical, cleanText } = require('./domain');
const primary = ['nurse', 'doctor'];
const referral = ['general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist', 'physiatrist'];
const has = (member, roles) => member.roles.some((role) => roles.includes(role));
const terminalTaskStatuses = new Set(['resolved', 'rejected']);
const taskTransitions = {
  created: ['notified', 'accepted', 'rejected'],
  notified: ['accepted', 'rejected'],
  accepted: ['in_progress', 'resolved', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
};
function taskGrantsAccess(task, member) {
  return member.roles.includes(task.recipientRole)
    && !terminalTaskStatuses.has(task.status)
    && (task.recipientRole !== 'social_worker' || Boolean(task.assignedToUid))
    && (!task.assignedToUid || task.assignedToUid === member.uid);
}
function assertTaskTransition(previous, next) {
  if (terminalTaskStatuses.has(previous)) throw Object.assign(new Error('La gestión ya está cerrada.'), { status: 409 });
  if (next && next !== previous && !taskTransitions[previous]?.includes(next)) {
    throw Object.assign(new Error('Cambio de estado de gestión no permitido.'), { status: 409 });
  }
}
function minimalPatient(patient, social = false) {
  const { id, centerId, rut, name, birthDate, contact, comuna, preAdmissionStatus, intakeAssignedToUid, createdAt, updatedAt } = patient;
  return { id, centerId, rut, name, birthDate, contact, comuna, preAdmissionStatus, intakeAssignedToUid, version: patient.version, createdAt, updatedAt,
    verification: { status: 'draft' }, anamnesis: { medicalHistory: [], surgicalHistory: [], allergies: [], medications: [], allergyStatus: 'unknown' }, social: social ? patient.social : {}, socialVerification: social ? patient.socialVerification : undefined };
}
function intakePatient(patient) {
  const visible = minimalPatient(patient, true);
  return { ...visible, anamnesis: patient.anamnesis, verification: patient.verification, socialVerification: patient.socialVerification, photoStoragePath: patient.photoStoragePath };
}
function photoOnlyEncounter(encounter) {
  const { id, centerId, patientId, episodeId, encounterDate, status, photos, version, createdAt, updatedAt, careType } = encounter;
  return { id, centerId, patientId, episodeId, encounterDate, status, photos, version, createdAt, updatedAt, careType,
    wound: emptyWound(), wifi: emptyWifi(), nursing: emptyNursing(), medical: emptyMedical() };
}
function operationalTask(task) {
  const { id, centerId, patientId, episodeId, recipientRole, assignedToUid, priority, dueAt, status, createdByUid, createdByName, createdAt, updatedAt, type } = task;
  return { id, centerId, patientId, episodeId, recipientRole, assignedToUid, priority, dueAt, status, createdByUid, createdByName, createdAt, updatedAt, type, title: 'Gestión del equipo', reason: '' };
}
function projectState(member, state) {
  if (has(member, primary)) return state;
  const assigned = state.tasks.filter((task) => taskGrantsAccess(task, member));
  const clinicalEpisodes = new Set(assigned.filter((task) => referral.includes(task.recipientRole)).map((task) => task.episodeId));
  const clinicalPatients = new Set(state.episodes.filter((episode) => clinicalEpisodes.has(episode.id)).map((episode) => episode.patientId));
  const socialPatients = new Set(assigned.filter((task) => task.recipientRole === 'social_worker').map((task) => task.patientId));
  const tensPatients = new Set(has(member, ['tens']) && member.uid ? state.patients.filter((patient) => patient.intakeAssignedToUid === member.uid).map((patient) => patient.id) : []);
  const broad = has(member, ['coordinator']);
  return {
    patients: state.patients.filter((p) => broad || tensPatients.has(p.id) || clinicalPatients.has(p.id) || socialPatients.has(p.id)).map((p) => clinicalPatients.has(p.id) ? p : tensPatients.has(p.id) ? intakePatient(p) : minimalPatient(p, socialPatients.has(p.id))),
    episodes: state.episodes.filter((e) => broad || tensPatients.has(e.patientId) || clinicalEpisodes.has(e.id) || assigned.some((t) => t.episodeId === e.id)),
    encounters: state.encounters.filter((e) => tensPatients.has(e.patientId) || clinicalEpisodes.has(e.episodeId)).map((e) => clinicalEpisodes.has(e.episodeId) ? e : photoOnlyEncounter(e)),
    tasks: state.tasks.filter((t) => has(member, ['coordinator']) || taskGrantsAccess(t, member)).map((t) => taskGrantsAccess(t, member) ? (t.recipientRole === 'social_worker' ? { ...operationalTask(t), title: t.title, reason: t.reason, result: t.result } : t) : operationalTask(t)),
    attachments: state.attachments.filter((a) => clinicalEpisodes.has(a.episodeId)),
  };
}
function grade(value) { return typeof value === 'number' && [0, 1, 2, 3].includes(value) ? value : undefined; }
function requiredSections(encounter) {
  return encounter.careType === 'nursing' ? ['wound', 'nursing'] : encounter.careType === 'medical' ? ['wound', 'medical', 'wifi'] : ['wound', 'nursing', 'medical', 'wifi'];
}
function assertMutable(encounter) {
  if (['completed', 'cancelled'].includes(encounter.status)) throw Object.assign(new Error('La atención está cerrada. Agrega una adenda para corregirla.'), { status: 409 });
}
function assertComplete(encounter) {
  const missing = requiredSections(encounter).filter((key) => encounter[key]?.verification?.status !== 'confirmed');
  if (missing.length) throw Object.assign(new Error('Confirma las secciones requeridas antes de finalizar: ' + missing.join(', ')), { status: 400 });
}
function validateSection(key, section) {
  if (key === 'nursing' && section.debridement.includes('No realizado') && section.debridement.length > 1) throw Object.assign(new Error('No realizado no puede combinarse con un desbridamiento.'), { status: 400 });
  if (key === 'wound') {
    const total = ['granulationPercent', 'sloughPercent', 'necrosisPercent'].reduce((sum, field) => sum + (section[field] || 0), 0);
    if (total > 100) throw Object.assign(new Error('Los porcentajes de tejido superan el 100%.'), { status: 400 });
  }
  if (section.verification.status !== 'confirmed') return;
  const recorded = Object.entries(section).some(([field, value]) => field !== 'verification' && field !== 'assessmentStatus' && (Array.isArray(value) ? value.length : value !== undefined && value !== ''));
  if (!recorded) throw Object.assign(new Error('Registra hallazgos o el motivo de no evaluación antes de confirmar.'), { status: 400 });
  if (key === 'wifi' && [section.wound, section.ischemia, section.footInfection].some((v) => v == null) && !section.rationale) throw Object.assign(new Error('Explica los componentes WIfI no evaluados.'), { status: 400 });
}
function invalidate(verification) { return { ...verification, status: 'draft', confirmedByUid: null, confirmedByName: null, confirmedAt: null }; }
function referralSnapshot(encounter, patient, episode) {
  if (!encounter) return { text: 'Sin atención asociada. Revisar antecedentes antes de derivar.' };
  const w = encounter.wound, m = encounter.medical, n = encounter.nursing, wifi = encounter.wifi;
  const mark = (section) => section.verification?.status === 'confirmed' ? 'confirmado' : 'borrador';
  const text = [
    `Paciente: ${patient.name}. Lesión: ${episode.location}, pie ${episode.side === 'right' ? 'derecho' : 'izquierdo'}.`,
    `Atención: ${encounter.encounterDate}. Estado: ${encounter.status}.`,
    `Herida (${mark(w)}): ${w.lengthCm ?? '—'} × ${w.widthCm ?? '—'} × ${w.depthCm ?? '—'} cm. Signos registrados: ${w.infectionSigns.join(', ') || 'no consignados'}.`,
    `WIfI (${mark(wifi)}): W${wifi.wound ?? '—'} I${wifi.ischemia ?? '—'} fI${wifi.footInfection ?? '—'}. Sustento: ${wifi.rationale || 'no consignado'}.`,
    `Plan (${mark(m)}): ${m.clinicalImpression || 'sin impresión consignada'}. Infección: ${m.infectionAssessment || 'no consignada'}. Antimicrobianos: ${m.antibiotics || 'no consignados'}. ${m.treatmentPlan || ''}`,
    `Descarga indicada: ${m.offloadingPlan || 'no consignada'}. Aplicada (${mark(n)}): ${n.offloadingApplied.join(', ') || 'no consignada'}.`,
    `Alergias: ${patient.anamnesis.allergyStatus === 'none' ? 'sin alergias conocidas' : patient.anamnesis.allergies.join(', ') || 'no consignadas'}. Función renal: ${patient.anamnesis.renalDisease || 'no consignada'}.`,
    `Exámenes solicitados (no acredita resultados): ${m.requestedTests.join(', ') || 'no consignados'}.`,
  ].join('\n');
  return { encounterId: encounter.id, version: encounter.version, capturedAt: new Date().toISOString(), text: cleanText(text, 10000) };
}
module.exports = { has, primary, referral, minimalPatient, intakePatient, photoOnlyEncounter, operationalTask, projectState, taskGrantsAccess, assertTaskTransition, grade, requiredSections, assertMutable, assertComplete, validateSection, invalidate, referralSnapshot };
