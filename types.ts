export const CENTER_ROLES = [
  'center_admin',
  'coordinator',
  'tens',
  'nurse',
  'doctor',
  'general_surgeon',
  'vascular_surgeon',
  'vascular_nurse',
  'traumatologist',
  'physiatrist',
  'social_worker',
  'auditor',
] as const;

export type CenterRole = (typeof CENTER_ROLES)[number];

export const ROLE_LABELS: Record<CenterRole, string> = {
  center_admin: 'Administrador del centro',
  coordinator: 'Coordinación clínica',
  tens: 'TENS / Paramédico',
  nurse: 'Enfermería',
  doctor: 'Médico de pie diabético',
  general_surgeon: 'Cirugía general',
  vascular_surgeon: 'Cirugía vascular',
  vascular_nurse: 'Enfermería vascular',
  traumatologist: 'Traumatología',
  physiatrist: 'Fisiatría',
  social_worker: 'Trabajo social',
  auditor: 'Auditoría',
};

export type MembershipStatus = 'invited' | 'active' | 'disabled';
export type Priority = 'routine' | 'soon' | 'urgent';
export type WorkStatus = 'draft' | 'in_progress' | 'ready_for_review' | 'completed' | 'cancelled';
export type TaskStatus = 'created' | 'notified' | 'accepted' | 'in_progress' | 'resolved' | 'rejected';

export interface Center {
  id: string;
  name: string;
  code: string;
  region?: string;
  address?: string;
  logoStoragePath?: string;
  logoUrl?: string;
  whatsappNumber?: string;
  allowedDomains: string[];
  status: 'active' | 'suspended' | 'archived';
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  centerId: string;
  uid?: string;
  email: string;
  emailLower: string;
  displayName: string;
  roles: CenterRole[];
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  lastAccessAt?: string;
}

export interface SessionInfo {
  user: {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
  };
  platformAdmin: boolean;
  memberships: Membership[];
  centers: Center[];
}

export interface VerificationStamp {
  status: 'draft' | 'confirmed';
  enteredByUid?: string;
  enteredByName?: string;
  observedByUid?: string;
  observedByName?: string;
  confirmedByUid?: string;
  confirmedByName?: string;
  updatedAt?: string;
  confirmedAt?: string;
}

export interface Patient {
  id: string;
  centerId: string;
  rut: string;
  name: string;
  birthDate?: string;
  contact?: string;
  comuna?: string;
  photoStoragePath?: string;
  photoUrl?: string;
  preAdmissionStatus: 'minimal' | 'in_progress' | 'validated';
  anamnesis: {
    diabetesTreatment?: string;
    medicalHistory: string[];
    medicalHistoryDetails?: Record<string, string[]>;
    surgicalHistory: string[];
    surgicalHistoryDetails?: Record<string, string[]>;
    allergyStatus?: 'unknown' | 'none' | 'present';
    allergies: string[];
    medications: string[];
    smoking?: string;
    alcoholUse?: string;
    alcoholDetails?: string;
    substanceUse?: string;
    substanceDetails?: string;
    renalDisease?: string;
    vascularHistory?: string;
    neuropathy?: string;
    previousAmputations?: string;
  };
  social: {
    supportNetwork?: string;
    mobility?: string;
    transportBarriers?: string;
    housingBarriers?: string;
    notes?: string;
  };
  verification: VerificationStamp;
  createdAt: string;
  updatedAt: string;
}

export interface WoundEpisode {
  id: string;
  centerId: string;
  patientId: string;
  side: 'right' | 'left';
  location: string;
  onsetDate?: string;
  etiology?: string;
  referralSource?: string;
  status: 'active' | 'healed' | 'referred' | 'closed';
  priority: Priority;
  consentForPhotography: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoReference {
  id: string;
  kind: 'pre' | 'post';
  storagePath: string;
  url?: string;
  capturedAt: string;
  capturedByUid: string;
  capturedByName: string;
  mimeType: string;
  orientationConfirmed: boolean;
  scaleIncluded: boolean;
  quality: 'pending' | 'accepted' | 'repeat';
}

export interface WoundAssessment {
  lengthCm?: number;
  widthCm?: number;
  depthCm?: number;
  granulationPercent?: number;
  sloughPercent?: number;
  necrosisPercent?: number;
  exudate?: 'none' | 'low' | 'moderate' | 'high';
  odor?: 'none' | 'present';
  edges: string[];
  periwound: string[];
  exposedStructures: string[];
  infectionSigns: string[];
  painScore?: number;
  notes?: string;
  verification: VerificationStamp;
}

export interface WifiAssessment {
  wound?: 0 | 1 | 2 | 3;
  ischemia?: 0 | 1 | 2 | 3;
  footInfection?: 0 | 1 | 2 | 3;
  abi?: number;
  toePressure?: number;
  rationale?: string;
  verification: VerificationStamp;
}

export interface NursingCare {
  cleaning: string[];
  debridement: string[];
  primaryDressings: string[];
  secondaryDressings: string[];
  periwoundProtection: string[];
  advancedTherapies: string[];
  offloadingApplied: string[];
  education: string[];
  tolerance?: string;
  notes?: string;
  verification: VerificationStamp;
}

export interface MedicalPlan {
  clinicalImpression?: string;
  infectionAssessment?: string;
  antibiotics?: string;
  requestedTests: string[];
  offloadingPlan?: string;
  treatmentPlan?: string;
  followUpDays?: number;
  warningSigns?: string;
  verification: VerificationStamp;
}

export interface Encounter {
  id: string;
  centerId: string;
  patientId: string;
  episodeId: string;
  encounterDate: string;
  status: WorkStatus;
  wound: WoundAssessment;
  wifi: WifiAssessment;
  nursing: NursingCare;
  medical: MedicalPlan;
  photos: PhotoReference[];
  nursingNarrative?: string;
  medicalNarrative?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalTask {
  id: string;
  centerId: string;
  patientId: string;
  episodeId: string;
  encounterId?: string;
  type: 'general_surgery' | 'vascular' | 'traumatology' | 'physiatry' | 'social' | 'exam' | 'other';
  recipientRole: CenterRole;
  assignedToUid?: string;
  title: string;
  reason: string;
  priority: Priority;
  dueAt?: string;
  status: TaskStatus;
  result?: string;
  createdByUid: string;
  createdByName: string;
  acceptedByUid?: string;
  resolvedByUid?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalAttachment {
  id: string;
  centerId: string;
  patientId: string;
  episodeId: string;
  kind: 'laboratory' | 'pvr' | 'imaging' | 'other';
  title: string;
  storagePath: string;
  mimeType: string;
  url?: string;
  uploadedByUid: string;
  uploadedByName: string;
  createdAt: string;
}

export interface ClinicalState {
  patients: Patient[];
  episodes: WoundEpisode[];
  encounters: Encounter[];
  tasks: ClinicalTask[];
  attachments: ClinicalAttachment[];
}

export interface AuditEvent {
  id: string;
  centerId: string;
  action: string;
  actorUid: string;
  actorEmail: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}
