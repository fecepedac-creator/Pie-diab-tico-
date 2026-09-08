const crypto = require('node:crypto');

const CENTER_ROLES = Object.freeze([
  'center_admin', 'coordinator', 'tens', 'nurse', 'doctor', 'general_surgeon',
  'vascular_surgeon', 'vascular_nurse', 'traumatologist', 'physiatrist',
  'social_worker', 'auditor',
]);

const CLINICAL_ROLES = CENTER_ROLES.filter((role) => !['center_admin', 'auditor'].includes(role));
const DOCTOR_ROLES = ['doctor', 'general_surgeon', 'vascular_surgeon', 'traumatologist', 'physiatrist'];

function cleanText(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanEmail(value) {
  const email = cleanText(value, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Correo electrónico inválido.');
  return email;
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(cleanEmail(email)).digest('hex');
}

function normalizeRut(value) {
  return cleanText(value, 20).replace(/[^0-9kK]/g, '').toUpperCase();
}

function isValidRut(value) {
  const rut = normalizeRut(value);
  if (rut.length < 2) return false;
  const body = rut.slice(0, -1);
  const verifier = rut.slice(-1);
  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return verifier === expected;
}

function cleanStringArray(value, maxItems = 30, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => cleanText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function stamp(actor, status = 'draft', previous = {}) {
  const now = new Date().toISOString();
  return {
    ...previous,
    status,
    enteredByUid: previous.enteredByUid || actor.uid,
    enteredByName: previous.enteredByName || actor.name,
    updatedAt: now,
    ...(status === 'confirmed' ? { confirmedByUid: actor.uid, confirmedByName: actor.name, confirmedAt: now } : {}),
  };
}

function emptyWound() {
  return { edges: [], periwound: [], exposedStructures: [], infectionSigns: [], verification: { status: 'draft' } };
}

function emptyWifi() { return { verification: { status: 'draft' } }; }
function emptyNursing() {
  return { cleaning: [], debridement: [], primaryDressings: [], secondaryDressings: [], periwoundProtection: [], advancedTherapies: [], offloadingApplied: [], education: [], verification: { status: 'draft' } };
}
function emptyMedical() { return { requestedTests: [], verification: { status: 'draft' } }; }

function listSentence(values) { return values && values.length ? values.join(', ') : 'no consignado'; }
function measurement(wound) {
  if (wound.lengthCm == null && wound.widthCm == null && wound.depthCm == null) return 'dimensiones no consignadas';
  return `${wound.lengthCm ?? '-'} x ${wound.widthCm ?? '-'} x ${wound.depthCm ?? '-'} cm (largo x ancho x profundidad)`;
}

function nursingNarrative(encounter) {
  const w = encounter.wound || emptyWound();
  const n = encounter.nursing || emptyNursing();
  return [
    `Curación avanzada de lesión en pie diabético. Herida de ${measurement(w)}.`,
    `Lecho: granulación ${w.granulationPercent ?? '-'}%, esfacelo ${w.sloughPercent ?? '-'}%, necrosis ${w.necrosisPercent ?? '-'}%. Exudado: ${w.exudate || 'no consignado'}; olor: ${w.odor || 'no consignado'}.`,
    `Bordes: ${listSentence(w.edges)}. Piel perilesional: ${listSentence(w.periwound)}. Signos de infección: ${listSentence(w.infectionSigns)}. Dolor EVA: ${w.painScore ?? 'no consignado'}.`,
    `Se realiza limpieza con ${listSentence(n.cleaning)}; desbridamiento: ${listSentence(n.debridement)}; apósito primario: ${listSentence(n.primaryDressings)}; apósito secundario: ${listSentence(n.secondaryDressings)}.`,
    `Protección perilesional: ${listSentence(n.periwoundProtection)}. Terapias avanzadas: ${listSentence(n.advancedTherapies)}. Descarga aplicada: ${listSentence(n.offloadingApplied)}. Educación: ${listSentence(n.education)}. Tolerancia: ${n.tolerance || 'no consignada'}.`,
    n.notes ? `Observaciones de enfermería: ${n.notes}.` : '',
  ].filter(Boolean).join(' ');
}

function medicalNarrative(encounter) {
  const w = encounter.wound || emptyWound();
  const wifi = encounter.wifi || emptyWifi();
  const m = encounter.medical || emptyMedical();
  return [
    `Evaluación médica de herida de ${measurement(w)}. Exudado ${w.exudate || 'no consignado'}, olor ${w.odor || 'no consignado'}, signos de infección: ${listSentence(w.infectionSigns)}.`,
    `Clasificación WIfI registrada: W${wifi.wound ?? '-'} I${wifi.ischemia ?? '-'} fI${wifi.footInfection ?? '-'}; ITB ${wifi.abi ?? 'no consignado'}; presión de ortejo ${wifi.toePressure ?? 'no consignada'} mmHg. La etapa clínica no se calcula automáticamente y requiere juicio profesional.`,
    `Impresión: ${m.clinicalImpression || 'no consignada'}. Evaluación de infección: ${m.infectionAssessment || 'no consignada'}. Antimicrobianos: ${m.antibiotics || 'no consignados'}.`,
    `Plan: ${m.treatmentPlan || 'no consignado'}. Descarga: ${m.offloadingPlan || 'no consignada'}. Exámenes solicitados: ${listSentence(m.requestedTests)}. Control en ${m.followUpDays ?? 'plazo no consignado'} días. Signos de alarma: ${m.warningSigns || 'no consignados'}.`,
  ].join(' ');
}

function sanitizeRoles(value) {
  return [...new Set(Array.isArray(value) ? value.filter((role) => CENTER_ROLES.includes(role)) : [])];
}

module.exports = {
  CENTER_ROLES, CLINICAL_ROLES, DOCTOR_ROLES, cleanText, cleanEmail, hashEmail,
  normalizeRut, isValidRut, cleanStringArray, sanitizeRoles, stamp, emptyWound,
  emptyWifi, emptyNursing, emptyMedical, nursingNarrative, medicalNarrative,
};
