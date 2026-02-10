
import { WifiScore, Visit, Episode, Patient } from './types';

export const generateId = () => {
  // Fallback robusto para crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Ignorar error y usar fallback
    }
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const validateRUT = (rut: string): boolean => {
  if (!/^[0-9]+-[0-9kK]{1}$/.test(rut)) return false;
  const [num, dv] = rut.split('-');
  let sum = 0;
  let multiplier = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    sum += parseInt(num[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expectedDv = 11 - (sum % 11);
  const dvStr = expectedDv === 11 ? '0' : expectedDv === 10 ? 'k' : expectedDv.toString();
  return dvStr.toLowerCase() === dv.toLowerCase();
};

export const formatRUT = (rut: string): string => {
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length < 2) return clean;
  const num = clean.slice(0, -1);
  const dv = clean.slice(-1);
  return `${num}-${dv}`;
};

export const formatDate = (date: string) => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Fecha Inválida';
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return 'Fecha Inválida';
  }
};

export const calculateWifi = (episode: Episode, lastVisit?: Visit): WifiScore => {
  let w: 0 | 1 | 2 | 3 = 0;
  if (lastVisit && lastVisit.size) {
    if (lastVisit.size.depth > 10) w = 3;
    else if (lastVisit.size.depth > 3) w = 2;
    else if (lastVisit.size.depth > 0) w = 1;
  }

  let iScore: 0 | 1 | 2 | 3 = 0;
  const abi = episode.vascularStatus?.abi;
  if (abi !== undefined) {
    if (abi < 0.4) iScore = 3;
    else if (abi < 0.6) iScore = 2;
    else if (abi < 0.8) iScore = 1;
  }

  let fi: 0 | 1 | 2 | 3 = 0;
  if (lastVisit?.infectionToday?.has) {
    const sev = lastVisit.infectionToday.severity;
    if (sev?.includes('Grado 4')) fi = 3;
    else if (sev?.includes('Grado 3')) fi = 2;
    else if (sev?.includes('Grado 2')) fi = 1;
  }

  const sum = w + iScore + fi;
  let risk: WifiScore['amputationRisk'] = 'Muy Bajo';
  let benefit: WifiScore['revascularizationBenefit'] = 'Mínimo';

  if (sum >= 7 || iScore === 3 || w === 3) {
    risk = 'Alto';
    benefit = 'Alto';
  } else if (sum >= 4) {
    risk = 'Moderado';
    benefit = 'Moderado';
  } else if (sum >= 1) {
    risk = 'Bajo';
    benefit = 'Bajo';
  }

  return {
    wound: w,
    ischemia: iScore,
    footInfection: fi,
    clinicalStage: Math.min(4, Math.ceil(sum / 2) || 1),
    amputationRisk: risk,
    revascularizationBenefit: benefit
  };
};