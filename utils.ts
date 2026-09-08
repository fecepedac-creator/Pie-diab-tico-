import type { Encounter, Patient, WoundEpisode } from './types';

export function formatRut(value: string): string {
  const clean = value.replace(/[^0-9kK]/g, '').slice(0, 9);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1).toUpperCase()}`;
}

export function validateRut(value: string): boolean {
  const normalized = formatRut(value);
  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false;
  const [body, checkDigit] = normalized.split('-');
  let sum = 0;
  let factor = 2;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return expected === checkDigit;
}

export function formatDate(value?: string): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(date);
}

export function formatDateTime(value?: string): string {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha inválida';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function joinOrNone(values: string[], none = 'no registrado'): string {
  return values.length > 0 ? values.join(', ') : none;
}

function dimensions(encounter: Encounter): string {
  const { lengthCm, widthCm, depthCm } = encounter.wound;
  if ([lengthCm, widthCm, depthCm].every((value) => typeof value === 'number')) {
    return `${lengthCm} × ${widthCm} × ${depthCm} cm`;
  }
  return 'dimensiones pendientes de completar';
}

export function generateNursingNarrative(
  patient: Patient,
  episode: WoundEpisode,
  encounter: Encounter,
): string {
  const side = episode.side === 'right' ? 'derecho' : 'izquierdo';
  const tissue = [
    encounter.wound.granulationPercent !== undefined ? `${encounter.wound.granulationPercent}% granulación` : '',
    encounter.wound.sloughPercent !== undefined ? `${encounter.wound.sloughPercent}% esfacelo` : '',
    encounter.wound.necrosisPercent !== undefined ? `${encounter.wound.necrosisPercent}% necrosis` : '',
  ].filter(Boolean).join(', ');

  return [
    `Se realiza curación avanzada a ${patient.name}, lesión ubicada en ${episode.location} de pie ${side}, de ${dimensions(encounter)}.`,
    tissue ? `Lecho con ${tissue}.` : '',
    encounter.wound.exudate ? `Exudado ${encounter.wound.exudate}.` : '',
    `Se efectúa limpieza con ${joinOrNone(encounter.nursing.cleaning)}, desbridamiento ${joinOrNone(encounter.nursing.debridement)} y cobertura primaria con ${joinOrNone(encounter.nursing.primaryDressings)}.`,
    encounter.nursing.secondaryDressings.length ? `Cobertura secundaria: ${encounter.nursing.secondaryDressings.join(', ')}.` : '',
    encounter.nursing.periwoundProtection.length ? `Protección perilesional: ${encounter.nursing.periwoundProtection.join(', ')}.` : '',
    encounter.nursing.offloadingApplied.length ? `Descarga aplicada: ${encounter.nursing.offloadingApplied.join(', ')}.` : '',
    encounter.nursing.education.length ? `Educación entregada: ${encounter.nursing.education.join(', ')}.` : '',
    encounter.nursing.tolerance ? `Tolerancia al procedimiento: ${encounter.nursing.tolerance}.` : '',
    encounter.nursing.notes || '',
  ].filter(Boolean).join(' ');
}

export function generateMedicalNarrative(
  patient: Patient,
  episode: WoundEpisode,
  encounter: Encounter,
): string {
  const side = episode.side === 'right' ? 'derecho' : 'izquierdo';
  const wifi = [encounter.wifi.wound, encounter.wifi.ischemia, encounter.wifi.footInfection]
    .every((value) => value !== undefined)
    ? `WIfI W${encounter.wifi.wound} I${encounter.wifi.ischemia} fI${encounter.wifi.footInfection}`
    : 'WIfI pendiente';

  return [
    `${patient.name} en control por lesión de ${episode.location} en pie ${side}, de ${dimensions(encounter)}.`,
    encounter.wound.infectionSigns.length ? `Signos de infección consignados: ${encounter.wound.infectionSigns.join(', ')}.` : 'Sin signos de infección consignados.',
    `${wifi}.`,
    encounter.medical.clinicalImpression ? `Impresión clínica: ${encounter.medical.clinicalImpression}.` : '',
    encounter.medical.infectionAssessment ? `Evaluación infecciosa: ${encounter.medical.infectionAssessment}.` : '',
    encounter.medical.antibiotics ? `Antibioterapia: ${encounter.medical.antibiotics}.` : '',
    encounter.medical.requestedTests.length ? `Se solicitan: ${encounter.medical.requestedTests.join(', ')}.` : '',
    encounter.medical.offloadingPlan ? `Descarga: ${encounter.medical.offloadingPlan}.` : '',
    encounter.medical.treatmentPlan ? `Plan: ${encounter.medical.treatmentPlan}.` : '',
    encounter.medical.followUpDays ? `Control en ${encounter.medical.followUpDays} días.` : '',
    encounter.medical.warningSigns ? `Signos de alarma informados: ${encounter.medical.warningSigns}.` : '',
  ].filter(Boolean).join(' ');
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
