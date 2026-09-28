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
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Object.assign(new Error('Correo electrónico inválido.'), { status: 400 });
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

function cleanDetailMap(value, allowedKeys = [], maxEntries = 12, maxLength = 300) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(allowedKeys.map((key) => {
    const entries = cleanStringArray(value[key], maxEntries, maxLength);
    return entries.length ? [key, entries] : null;
  }).filter(Boolean));
}

function stamp(actor, status = 'draft', previous = {}) {
  const now = new Date().toISOString();
  return {
    ...previous,
    status,
    enteredByUid: previous.enteredByUid || actor.uid,
    enteredByName: previous.enteredByName || actor.name,
    updatedAt: now,
    ...(status === 'confirmed' ? { confirmedByUid: actor.uid, confirmedByName: actor.name, confirmedAt: now } : { confirmedByUid: null, confirmedByName: null, confirmedAt: null }),
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
  if (wound.diameterCm != null) return `${wound.diameterCm} cm de diámetro`;
  if (wound.lengthCm == null && wound.widthCm == null && wound.depthCm == null) return 'dimensiones no consignadas';
  return `${wound.lengthCm ?? '-'} x ${wound.widthCm ?? '-'} x ${wound.depthCm ?? '-'} cm (largo x ancho x profundidad)`;
}

function nursingNarrative(encounter) {
  const w = encounter.wound || emptyWound();
  const n = encounter.nursing || emptyNursing();
  const side = encounter.episodeSide === 'right' ? 'derecho' : encounter.episodeSide === 'left' ? 'izquierdo' : '';
  const site = [encounter.episodeLocation, side && `pie ${side}`].filter(Boolean).join(' de ');
  const tissues = [['granulación', w.granulationPercent], ['esfacelo', w.sloughPercent], ['necrosis', w.necrosisPercent]]
    .filter(([, value]) => value != null).map(([label, value]) => `${value}% de tejido de ${label}`);
  const hasAssessment = [w.diameterCm, w.lengthCm, w.widthCm, w.depthCm, w.granulationPercent, w.sloughPercent, w.necrosisPercent, w.exudate, w.odor, w.localColor, w.probeDepthCm, w.boneContact, w.pedalPulse, w.notes].some((value) => value != null && value !== '') || [w.edges, w.periwound, w.infectionSigns, w.exposedStructures, w.pockets].some((value) => value?.length);
  const description = hasAssessment ? [
    site ? `Se observa lesión en ${site}` : 'Se observa lesión',
    (w.diameterCm != null || w.lengthCm != null || w.widthCm != null || w.depthCm != null) ? `de ${measurement(w)}` : '',
  ].filter(Boolean).join(' ') : site ? `Episodio de lesión en ${site}` : '';
  const findings = [
    description ? `${description}.` : '',
    tissues.length ? `El lecho presenta ${tissues.join(', ')}.` : '',
    w.exudate ? `Exudado ${({ none: 'ausente', low: 'escaso', moderate: 'moderado', high: 'abundante' })[w.exudate]}${w.exudateDescription ? `, ${w.exudateDescription}` : ''}.` : w.exudateDescription ? `Exudado: ${w.exudateDescription}.` : '',
    w.odor ? `Olor ${w.odor === 'present' ? 'presente' : 'ausente'}.` : '',
    w.edges?.length ? `Bordes ${w.edges.join(', ').toLowerCase()}.` : '',
    w.periwound?.length ? `Piel perilesional ${w.periwound.join(', ').toLowerCase()}.` : '',
    w.infectionSigns?.length ? `Signos locales observados: ${w.infectionSigns.join(', ')}.` : '',
    w.exposedStructures?.length ? `Estructuras expuestas: ${w.exposedStructures.join(', ')}.` : '',
    w.pockets?.some((pocket) => pocket.direction && pocket.depthCm != null) ? `Bolsillos: ${w.pockets.filter((pocket) => pocket.direction && pocket.depthCm != null).map((pocket) => `${pocket.direction} ${pocket.depthCm} cm`).join(', ')}.` : '',
    w.probeDepthCm != null ? `La pinza se introduce ${w.probeDepthCm} cm${w.boneContact === 'yes' ? ' con contacto óseo' : w.boneContact === 'no' ? ' sin contacto óseo' : ''}.` : w.boneContact ? `Exploración: ${w.boneContact === 'yes' ? 'contacto óseo' : 'sin contacto óseo'}.` : '',
    w.pedalPulse ? `Pulso pedio ${w.pedalPulse === 'present' ? 'presente' : 'ausente'}.` : '',
    w.localColor ? `Coloración local ${w.localColor}.` : '',
    w.painScore != null ? `Dolor EVA ${w.painScore}.` : '',
    w.notes ? `${w.notes.replace(/\.$/, '')}.` : '',
  ].filter(Boolean).join(' ');
  const cleansing = [
    n.irrigationTechnique && n.initialIrrigation ? `Se irriga la piel mediante ${n.irrigationTechnique} con ${n.initialIrrigation}.` : n.initialIrrigation ? `Se irriga la piel con ${n.initialIrrigation}.` : n.irrigationTechnique ? `Técnica de irrigación registrada: ${n.irrigationTechnique}.` : '',
    n.repeatIrrigation ? `Se vuelve a irrigar con ${n.repeatIrrigation}.` : '',
    n.dryingMaterial ? `Se seca con ${n.dryingMaterial}.` : '',
    n.cleanser ? `Se aplica ${n.cleanser}${n.cleanserCarrier ? ` sobre ${n.cleanserCarrier}` : ''}${n.cleanserMinutes != null ? ` y se deja actuar por ${n.cleanserMinutes} minutos` : ''}.` : '',
  ].filter(Boolean).join(' ');
  const debridement = n.debridementDetails
    ? `${n.debridementDetails.replace(/\.$/, '')}.${n.debridement?.length ? ` Desbridamiento registrado: ${n.debridement.join(', ')}.` : ''}`
    : n.debridement?.length ? `Desbridamiento: ${n.debridement.join(', ')}.` : '';
  const dressings = [
    n.periwoundProtection?.length ? `Se aplica ${n.periwoundProtection.join(', ')} en piel perilesional.` : '',
    n.primaryDressings?.length ? `En el lecho se deja ${n.primaryDressings.join(', ')}.` : '',
    n.secondaryDressings?.length ? `Se cubre con ${n.secondaryDressings.join(', ')}.` : '',
    n.fixation ? `Se fija con ${n.fixation}.` : '',
    n.advancedTherapies?.length ? `Terapias avanzadas: ${n.advancedTherapies.join(', ')}.` : '',
    n.offloadingApplied?.length ? `Descarga aplicada: ${n.offloadingApplied.join(', ')}.` : '',
    n.education?.length ? `Educación entregada: ${n.education.join(', ')}.` : '',
    n.tolerance ? `Tolerancia: ${n.tolerance}.` : '',
    n.notes ? `${n.notes.replace(/\.$/, '')}.` : '',
  ].filter(Boolean).join(' ');
  return [
    `Registro de enfermería (${n.verification.status === 'confirmed' ? 'confirmado' : 'borrador'}).`,
    n.removedDressingLevel || n.removedDressingContent ? `Se retiran apósitos${n.removedDressingLevel ? ` pasados hasta ${n.removedDressingLevel}` : ''}${n.removedDressingContent ? ` con ${n.removedDressingContent}` : ''}.` : '',
    cleansing || (n.cleaning?.length ? `Limpieza registrada: ${n.cleaning.join(', ')}.` : ''),
    findings,
    debridement,
    n.cleanser && n.repeatCleanserMinutes != null ? `Se vuelve a aplicar ${n.cleanser}${n.cleanserCarrier ? ` sobre ${n.cleanserCarrier}` : ''} y se deja actuar por ${n.repeatCleanserMinutes} minutos.` : '',
    dressings,

  ].filter(Boolean).join(' ');
}

function medicalNarrative(encounter) {
  const w = encounter.wound || emptyWound();
  const wifi = encounter.wifi || emptyWifi();
  const m = encounter.medical || emptyMedical();
  return [
    `Evaluación médica de herida de ${measurement(w)}. Exudado ${({ none: 'ausente', low: 'escaso', moderate: 'moderado', high: 'abundante' })[w.exudate] || 'no consignado'}, olor ${({ none: 'ausente', present: 'presente' })[w.odor] || 'no consignado'}, signos de infección: ${listSentence(w.infectionSigns)}.`,
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
  normalizeRut, isValidRut, cleanStringArray, cleanDetailMap, sanitizeRoles, stamp, emptyWound,
  emptyWifi, emptyNursing, emptyMedical, nursingNarrative, medicalNarrative,
};
