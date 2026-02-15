
export enum UserRole {
  ADMIN = 'Admin',
  DOCTOR = 'Médico Diabetología',
  NURSE = 'Enfermería',
  SURGERY = 'Cirugía General',
  VASCULAR = 'Cirugía Vascular',
  PHYSIATRY = 'Fisiatría',
  AUDITOR = 'Auditor'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

export interface LabResult {
  id: string;
  date: string;
  albumin?: number;
  vfg?: number;
  pcr?: number;
  vhs?: number;
  leucocitos?: number;
  hba1c?: number;
}

export interface ImagingResult {
  id: string;
  date: string;
  type: 'Radiografía' | 'AngioTAC' | 'Eco Doppler' | 'RM';
  report: string;
  imageUrl?: string;
}

export interface MedicalDocument {
  id: string;
  date: string;
  type: 'Epicrisis' | 'Protocolo Operatorio' | 'Informe de Alta' | 'Interconsulta' | 'Otros';
  title: string;
  content: string; 
  authorRole: UserRole;
}

export interface SurgicalProcedure {
  id: string;
  date: string;
  type: 'Vascular' | 'General';
  description: string; 
  specialistId: string;
  specialistRole: UserRole;
  notes?: string;
}

export interface ReferralReport {
  id: string;
  episodeId: string;
  patientId: string;
  date: string;
  content: string;
  status: 'Pendiente' | 'Revisado';
  senderRole: UserRole;
}

export interface Patient {
  id: string;
  rut: string;
  name: string;
  birthDate: string;
  comuna: string;
  contact?: string;
  comorbidities: string[];
  complications: {
    retinopathy: boolean;
    nephropathy: boolean;
    ercStage: string;
    iam: { has: boolean; year?: number };
    acv: { has: boolean; year?: number };
  };
  neuropathy: {
    has: boolean;
    method: 'Monofilamento' | 'Diapasón' | 'Ambos';
    lastUpdate: string;
  };
  metabolicTargets: {
    hba1c: string;
    pa: string;
    ldl: string;
    lastDate: string;
  };
  socialDeterminants: {
    hasEffectiveSupport: boolean;
    livingConditions: string;
  };
  labHistory: LabResult[];
  imagingHistory: ImagingResult[];
  createdAt: string;
}

export interface WifiScore {
  wound: 0 | 1 | 2 | 3;
  ischemia: 0 | 1 | 2 | 3;
  footInfection: 0 | 1 | 2 | 3;
  clinicalStage: number;
  amputationRisk: 'Muy Bajo' | 'Bajo' | 'Moderado' | 'Alto';
  revascularizationBenefit: 'Mínimo' | 'Bajo' | 'Moderado' | 'Alto';
}

export interface Episode {
  id: string;
  patientId: string;
  startDate: string;
  side: 'D' | 'I';
  location: string;
  etiology: string;
  vascularStatus: {
    pulses: { dp: string; pt: string };
    abi?: number;
    tbi?: number;
    revascularizable: 'Sí' | 'No' | 'En estudio';
    examRequested?: string;
    examStatus?: string;
    plan?: string;
  };
  infectionBasal: {
    has: boolean;
    severity?: 'Leve' | 'Moderada' | 'Severa';
  };
  strategy: 'Salvataje' | 'Paliativo' | 'Plan Amputación';
  amputationMajorRisk: {
    enabled: boolean;
    criteria?: string[];
    decisionDate?: string;
  };
  procedures: SurgicalProcedure[];
  documents: MedicalDocument[];
  isActive: boolean;
}

export interface Visit {
  id: string;
  episodeId: string;
  date: string;
  professionalId: string;
  professionalRole: UserRole;
  photoUrl: string;
  evolution: 'Mejor' | 'Igual' | 'Peor';
  size: {
    length: number;
    width: number;
    depth: number;
    notMeasuredReason?: string;
  };
  infectionToday: {
    has: boolean;
    severity?: 'Grado 1 (Limpia)' | 'Grado 2 (Leve)' | 'Grado 3 (Moderada)' | 'Grado 4 (Severa/Sepsis)';
    signs?: string[];
  };
  atb: {
    inCourse: boolean;
    scheme?: string;
    dose?: string;
    startDate?: string;
    endDate?: string;
    responsible?: string;
  };
  culture: {
    taken: boolean;
    type?: 'Tejido profundo' | 'Óseo' | 'Hisopo';
    resultStatus: 'Pendiente' | 'Disponible' | 'No tomado';
    resultDetails?: string;
    sensitivities?: { drug: string, sensitive: boolean }[];
  };
  nursingTactics?: {
    cleaning: string;
    debridement: string;
    dressings: string[];
    advancedTherapies: string[];
    otherTechnique?: string;
  };
  plan: string;
  responsiblePlan: UserRole;
  isClinicalAlert?: boolean;
}

export interface Alert {
  id: string;
  type: 'Clinical' | 'Administrative' | 'PROA' | 'Social' | 'Nursing' | 'Surgical';
  severity: 'Low' | 'Medium' | 'High';
  message: string;
  episodeId?: string;
  patientId?: string;
  createdAt: string;
  isResolved: boolean;
}