import { useMemo, useState } from 'react';
import { CENTER_ROLES, ROLE_LABELS, type CenterRole, type ClinicalState, type Membership } from '../types';
import CenterAdminDashboard from './CenterAdminDashboard';
import ClinicalDashboard from './ClinicalDashboard';
import './profile-demo.css';

const DEMO_ROLES = CENTER_ROLES.filter((role) => role !== 'auditor');

const ROLE_HINTS: Partial<Record<CenterRole, string>> = {
  center_admin: 'Gestiona el equipo y la configuración del centro.',
  coordinator: 'Coordina ingresos, episodios y tareas del equipo.',
  tens: 'Realiza el ingreso rápido y el registro fotográfico.',
  nurse: 'Completa el preingreso y registra la curación avanzada.',
  doctor: 'Caracteriza la herida, aplica WIfI y define el plan.',
  general_surgeon: 'Revisa casos derivados y aporta evaluación quirúrgica.',
  vascular_surgeon: 'Evalúa perfusión, exámenes y conducta vascular.',
  vascular_nurse: 'Gestiona horas, PVR y continuidad vascular.',
  traumatologist: 'Evalúa compromiso osteoarticular y conducta.',
  physiatrist: 'Planifica descarga, movilidad y rehabilitación.',
  social_worker: 'Evalúa red de apoyo y barreras sociales.',
};

const now = '2026-09-08T12:00:00.000Z';
const demoImage = (label: string, color: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#eef5f3"/><ellipse cx="320" cy="240" rx="170" ry="115" fill="${color}" opacity=".28"/><circle cx="320" cy="240" r="65" fill="${color}" opacity=".72"/><text x="320" y="420" text-anchor="middle" font-family="Arial" font-size="25" fill="#173334">${label} · imagen clínica ficticia</text></svg>`)}`;
const demoCenter = {
  id: 'demo-center', name: 'Centro Clínico de Demostración', code: 'DEMO', region: 'Región de ejemplo',
  address: 'Dirección ficticia', whatsappNumber: '56900000000', allowedDomains: ['ejemplo.cl'], status: 'active' as const,
  createdAt: now, updatedAt: now,
};

const demoMembers: Membership[] = [
  { id: 'demo-member-1', centerId: demoCenter.id, uid: 'demo-1', email: 'enfermeria@ejemplo.cl', emailLower: 'enfermeria@ejemplo.cl', displayName: 'Andrea Enfermera', roles: ['nurse'], status: 'active', createdAt: now, updatedAt: now },
  { id: 'demo-member-2', centerId: demoCenter.id, uid: 'demo-2', email: 'medico@ejemplo.cl', emailLower: 'medico@ejemplo.cl', displayName: 'Martín Médico', roles: ['doctor'], status: 'active', createdAt: now, updatedAt: now },
  { id: 'demo-member-3', centerId: demoCenter.id, uid: 'demo-3', email: 'tens@ejemplo.cl', emailLower: 'tens@ejemplo.cl', displayName: 'Teresa TENS', roles: ['tens'], status: 'active', createdAt: now, updatedAt: now },
];

const demoState: ClinicalState = {
  patients: [{
    id: 'demo-patient', centerId: demoCenter.id, rut: '000000000', name: 'Paciente Demostración', birthDate: '1962-04-18', contact: '+56 9 0000 0000', comuna: 'Comuna de ejemplo',
    preAdmissionStatus: 'validated', anamnesis: { diabetesTreatment: 'Insulina', medicalHistory: ['DM-2', 'HTA', 'Dislipidemia'], medicalHistoryDetails: { 'DM-2': ['Diagnóstico hace aproximadamente 12 años'], HTA: ['Diagnóstico aproximado en 2018'] }, surgicalHistory: ['Angioplastia EEII', 'Amputación menor'], surgicalHistoryDetails: { 'Angioplastia EEII': ['Extremidad inferior derecha, 2020'], 'Amputación menor': ['1.er ortejo derecho, 2001', '2.º ortejo derecho, 2003'] }, allergyStatus: 'none', allergies: [], medications: ['Metformina', 'Insulina', 'AAS', 'Estatina'], smoking: 'Exfumador/a', alcoholUse: 'Ocasional', alcoholDetails: '1 a 2 unidades por semana', substanceUse: 'Nunca', renalDisease: 'Sin ERC conocida', vascularHistory: 'Enfermedad arterial periférica', neuropathy: 'Presente', previousAmputations: 'Amputación menor' },
    social: { supportNetwork: 'Pareja, Hijos/as', mobility: 'Bastón', transportBarriers: 'Sin barreras', housingBarriers: 'Escaleras', notes: 'Cuenta con apoyo familiar para controles y curaciones.' }, socialVerification: { status: 'confirmed', confirmedByName: 'Trabajadora Social Demo', confirmedAt: now },
    verification: { status: 'confirmed', enteredByName: 'Andrea Enfermera', confirmedByName: 'Martín Médico', updatedAt: now, confirmedAt: now }, createdAt: now, updatedAt: now,
  }],
  episodes: [{ id: 'demo-episode', centerId: demoCenter.id, patientId: 'demo-patient', side: 'right', location: 'Plantar antepié', onsetDate: '2026-08-20', etiology: 'Neuropática', referralSource: 'Atención primaria', status: 'active', priority: 'soon', consentForPhotography: true, createdAt: now, updatedAt: now }],
  encounters: [{
    id: 'demo-encounter-previous', centerId: demoCenter.id, patientId: 'demo-patient', episodeId: 'demo-episode', encounterDate: '2026-08-25T12:00:00.000Z', status: 'ready_for_review', version: 3, createdAt: '2026-08-25T12:00:00.000Z', updatedAt: '2026-08-25T12:00:00.000Z',
    wound: { lengthCm: 3.2, widthCm: 2.1, depthCm: 0.4, granulationPercent: 55, sloughPercent: 35, necrosisPercent: 10, exudate: 'high', odor: 'present', edges: ['Hiperqueratósicos'], periwound: ['Maceración'], exposedStructures: [], infectionSigns: ['Eritema local'], painScore: 3, notes: 'Primera medición ficticia del episodio.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: '2026-08-25T12:00:00.000Z' } },
    wifi: { wound: 1, ischemia: 1, footInfection: 1, abi: 0.8, toePressure: 49, rationale: 'Clasificación inicial ficticia para mostrar la evolución.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: '2026-08-25T12:00:00.000Z' } },
    nursing: { cleaning: ['Suero fisiológico', 'PHMB'], debridement: ['Cortante conservador'], primaryDressings: ['Fibra gelificante'], secondaryDressings: ['Espuma'], periwoundProtection: ['Película barrera'], advancedTherapies: [], offloadingApplied: ['Fieltro'], education: ['Signos de alarma', 'Cuidado del apósito'], tolerance: 'Buena', notes: 'Registro inicial ficticio.', verification: { status: 'confirmed', confirmedByName: 'Andrea Enfermera', confirmedAt: '2026-08-25T12:00:00.000Z' } },
    medical: { clinicalImpression: 'Úlcera neuropática plantar con inflamación local, sin compromiso sistémico.', infectionAssessment: 'Inflamación local leve, sin fiebre ni signos sistémicos.', antibiotics: 'No indicados; vigilancia clínica estrecha.', requestedTests: ['PCR/VHS', 'PVR', 'HbA1c'], offloadingPlan: 'Iniciar descarga con fieltro y educación.', treatmentPlan: 'Curación avanzada y control precoz para comparar respuesta.', followUpDays: 7, warningSigns: 'Fiebre, eritema progresivo, dolor o aumento de secreción.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: '2026-08-25T12:00:00.000Z' } },
    photos: [{ id: 'demo-photo-previous', kind: 'pre', storagePath: 'synthetic/pre-previous.svg', url: demoImage('Precuración 25-08-2026', '#984c45'), capturedAt: '2026-08-25T09:00:00.000Z', capturedByUid: 'demo-3', capturedByName: 'Teresa TENS', mimeType: 'image/svg+xml', orientationConfirmed: true, scaleIncluded: true, quality: 'accepted' }], nursingNarrative: 'Registro ficticio inicial con limpieza, desbridamiento conservador, protección perilesional y descarga.', medicalNarrative: 'Registro ficticio inicial de úlcera neuropática plantar derecha con inflamación local leve.',
  }, {
    id: 'demo-encounter', centerId: demoCenter.id, patientId: 'demo-patient', episodeId: 'demo-episode', encounterDate: now, status: 'ready_for_review', version: 3, createdAt: now, updatedAt: now,
    wound: { lengthCm: 2.4, widthCm: 1.6, depthCm: 0.3, granulationPercent: 80, sloughPercent: 20, necrosisPercent: 0, exudate: 'moderate', odor: 'none', edges: ['Hiperqueratósicos'], periwound: ['Maceración leve'], exposedStructures: [], infectionSigns: [], painScore: 2, notes: 'Sin progresión proximal.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: now } },
    wifi: { wound: 1, ischemia: 1, footInfection: 0, abi: 0.82, toePressure: 52, rationale: 'Datos ficticios para conocer la distribución de la pantalla.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: now } },
    nursing: { cleaning: ['Suero fisiológico', 'PHMB'], debridement: ['Cortante conservador'], primaryDressings: ['Fibra gelificante'], secondaryDressings: ['Espuma'], periwoundProtection: ['Película barrera'], advancedTherapies: [], offloadingApplied: ['Fieltro'], education: ['Signos de alarma', 'Cuidado del apósito'], tolerance: 'Buena', notes: 'Procedimiento tolerado sin incidentes.', verification: { status: 'confirmed', confirmedByName: 'Andrea Enfermera', confirmedAt: now } },
    medical: { clinicalImpression: 'Úlcera neuropática plantar con respuesta parcial y perfusión por precisar.', infectionAssessment: 'Sin signos clínicos de infección sistémica.', antibiotics: 'No indicados en esta atención.', requestedTests: ['PCR/VHS', 'PVR', 'HbA1c'], offloadingPlan: 'Mantener descarga y reevaluar adherencia.', treatmentPlan: 'Continuar curación avanzada y solicitar evaluación especializada.', followUpDays: 7, warningSigns: 'Fiebre, eritema progresivo, dolor o aumento de secreción.', verification: { status: 'confirmed', confirmedByName: 'Martín Médico', confirmedAt: now } },
    photos: [{ id: 'demo-photo-pre', kind: 'pre', storagePath: 'synthetic/pre.svg', url: demoImage('Precuración 08-09-2026', '#b4554d'), capturedAt: '2026-09-08T09:00:00.000Z', capturedByUid: 'demo-3', capturedByName: 'Teresa TENS', mimeType: 'image/svg+xml', orientationConfirmed: true, scaleIncluded: true, quality: 'accepted' }, { id: 'demo-photo-post', kind: 'post', storagePath: 'synthetic/post.svg', url: demoImage('Postcuración 08-09-2026', '#bf7560'), capturedAt: '2026-09-08T09:30:00.000Z', capturedByUid: 'demo-3', capturedByName: 'Teresa TENS', mimeType: 'image/svg+xml', orientationConfirmed: true, scaleIncluded: true, quality: 'accepted' }], nursingNarrative: 'Paciente ficticio en control por úlcera plantar derecha. Se realiza limpieza, desbridamiento conservador, protección perilesional y cobertura avanzada. Procedimiento bien tolerado.', medicalNarrative: 'Paciente ficticio con úlcera neuropática plantar derecha, respuesta parcial y perfusión por precisar. Se solicita evaluación interdisciplinaria.',
  }],
  tasks: DEMO_ROLES.filter((role) => role !== 'center_admin').map((role, index) => ({ id: `demo-task-${role}`, centerId: demoCenter.id, patientId: 'demo-patient', episodeId: 'demo-episode', encounterId: 'demo-encounter', type: role === 'vascular_nurse' || role === 'vascular_surgeon' ? 'vascular' : role === 'physiatrist' ? 'physiatry' : role === 'social_worker' ? 'social' : role === 'traumatologist' ? 'traumatology' : role === 'general_surgeon' ? 'general_surgery' : 'other', recipientRole: role, title: `Evaluación solicitada a ${ROLE_LABELS[role]}`, reason: role === 'vascular_surgeon' || role === 'vascular_nurse' ? 'Úlcera plantar de evolución parcial con presión de ortejo de 52 mmHg. Se solicita revisar perfusión y necesidad de estudio vascular adicional.' : role === 'traumatologist' ? 'Lesión plantar persistente. Se solicita descartar compromiso osteoarticular y orientar estudio por imágenes.' : role === 'physiatrist' ? 'Se solicita optimizar descarga, ayudas técnicas y plan de rehabilitación.' : role === 'general_surgeon' ? 'Se solicita evaluar necesidad de desbridamiento quirúrgico.' : 'Caso ficticio derivado para conocer la vista de este perfil.', priority: index % 3 === 0 ? 'soon' : 'routine', status: 'created', createdByUid: 'demo-origin', createdByName: 'Martín Médico', createdAt: now, updatedAt: now })),
  attachments: [{ id: 'demo-lab', centerId: demoCenter.id, patientId: 'demo-patient', episodeId: 'demo-episode', kind: 'laboratory', title: 'PCR 18 mg/L · 06-09-2026.pdf', storagePath: 'synthetic/pcr.pdf', mimeType: 'application/pdf', uploadedByUid: 'demo-2', uploadedByName: 'Martín Médico', createdAt: '2026-09-06T12:00:00.000Z' }, { id: 'demo-pvr', centerId: demoCenter.id, patientId: 'demo-patient', episodeId: 'demo-episode', kind: 'pvr', title: 'PVR extremidades inferiores · 07-09-2026.pdf', storagePath: 'synthetic/pvr.pdf', mimeType: 'application/pdf', uploadedByUid: 'demo-vascular', uploadedByName: 'Enfermería Vascular Demo', createdAt: '2026-09-07T12:00:00.000Z' }],
};

export default function ProfileDemoDashboard({ onClose }: { onClose: () => void }) {
  const [role, setRole] = useState<CenterRole>('doctor');
  const membership = useMemo<Membership>(() => ({ id: `demo-${role}`, centerId: demoCenter.id, uid: `demo-${role}`, email: `${role}@ejemplo.cl`, emailLower: `${role}@ejemplo.cl`, displayName: `Usuario de ${ROLE_LABELS[role]}`, roles: [role], status: 'active', createdAt: now, updatedAt: now }), [role]);
  const noChange = async () => undefined;

  return <div className="profile-demo-shell" role="dialog" aria-modal="true" aria-label="Demostración de perfiles">
    <header className="profile-demo-header">
      <div><span className="demo-badge">MODO DEMO · SOLO VISUALIZACIÓN</span><h1>Vista por perfil</h1><p>Todos los nombres, antecedentes y tareas de esta sección son ficticios.</p></div>
      <button className="ghost" onClick={onClose}>Cerrar demostración</button>
    </header>
    <div className="profile-demo-layout">
      <aside className="profile-demo-roles" aria-label="Seleccionar perfil">
        <h2>Perfiles</h2>
        {DEMO_ROLES.map((item) => <button key={item} className={role === item ? 'selected' : ''} onClick={() => setRole(item)}><strong>{ROLE_LABELS[item]}</strong><small>{ROLE_HINTS[item]}</small></button>)}
      </aside>
      <main className="profile-demo-content">
        <div className="demo-readonly-banner"><strong>Vista protegida</strong><span>Puedes recorrer las pantallas, pero aquí no se guarda, envía ni modifica información.</span></div>
        {role === 'center_admin'
          ? <CenterAdminDashboard key={role} center={demoCenter} demoMode demoMembers={demoMembers} />
          : <ClinicalDashboard key={role} center={demoCenter} membership={membership} state={demoState} onRefresh={noChange} onEncounterChanged={() => undefined} demoMode />}
      </main>
    </div>
  </div>;
}
