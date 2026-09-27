import { auth } from '../firebase';
import type {
  AuditEvent,
  ClinicalAttachment,
  Center,
  CenterRole,
  ClinicalState,
  ClinicalTask,
  Encounter,
  Membership,
  PhotoMeasurement,
  NursingCatalog,
  NursingCatalogOptions,
  Patient,
  SessionInfo,
  WoundEpisode,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
if (import.meta.env.DEV && API_BASE !== '/api') throw new Error('El desarrollo local sólo admite la API sintética del emulador.');


export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'La sesión no está disponible.');
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({ error: 'Respuesta inválida del servidor.' }));
  if (!response.ok) throw new ApiError(response.status, payload.error || `Error ${response.status}`);
  return payload as T;
}

async function requestImage(path: string): Promise<Blob> {
  const user = auth.currentUser;
  if (!user) throw new ApiError(401, 'La sesión no está disponible.');
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Imagen no disponible.' }));
    throw new ApiError(response.status, payload.error || `Error ${response.status}`);
  }
  return response.blob();
}

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export const api = {
  session: () => request<SessionInfo>('/session'),

  listCenters: () => request<{ centers: Center[] }>('/platform/centers'),
  createCenter: (input: Partial<Center> & { name: string; adminEmail: string; adminName?: string; logoDataUrl?: string }) =>
    request<{ center: Center }>('/platform/centers', json('POST', input)),
  updateCenter: (centerId: string, input: Partial<Center> & { logoDataUrl?: string; removeLogo?: boolean }) =>
    request<{ center: Center }>(`/platform/centers/${centerId}`, json('PUT', input)),
  archiveCenter: (centerId: string) =>
    request<{ center: Center }>(`/platform/centers/${centerId}`, json('DELETE', {})),
  updateCenterSettings: (centerId: string, input: Pick<Center, 'name'> & Partial<Pick<Center, 'address' | 'region' | 'whatsappNumber'>>) =>
    request<{ center: Center }>(`/centers/${centerId}/settings`, json('PUT', input)),

  listMembers: (centerId: string) => request<{ members: Membership[] }>(`/centers/${centerId}/members`),
  inviteMember: (centerId: string, input: { email: string; displayName: string; roles: CenterRole[] }) =>
    request<{ member: Membership }>(`/centers/${centerId}/members`, json('POST', input)),
  updateMember: (centerId: string, memberId: string, input: { roles?: CenterRole[]; status?: Membership['status'] }) =>
    request<{ member: Membership }>(`/centers/${centerId}/members/${memberId}`, json('PUT', input)),

  getNursingCatalog: (centerId: string) => request<{ catalog: NursingCatalog }>(`/centers/${centerId}/nursing-catalog`),
  updateNursingCatalog: (centerId: string, input: { revision: number; options: NursingCatalogOptions }) =>
    request<{ catalog: NursingCatalog }>(`/centers/${centerId}/nursing-catalog`, json('PUT', input)),

  getState: (centerId: string) => request<ClinicalState>(`/centers/${centerId}/state`),
  listTensMembers: (centerId: string) => request<{ members: { uid: string; displayName: string }[] }>(`/centers/${centerId}/tens-members`),
  listSocialMembers: (centerId: string) => request<{ members: { uid: string; displayName: string }[] }>(`/centers/${centerId}/social-members`),
  createPatient: (centerId: string, input: Partial<Patient>) =>
    request<{ patient: Patient }>(`/centers/${centerId}/patients`, json('POST', input)),
  updatePatient: (centerId: string, patientId: string, input: Partial<Patient>) =>
    request<{ patient: Patient }>(`/centers/${centerId}/patients/${patientId}`, json('PUT', input)),
  uploadPatientPhoto: (centerId: string, patientId: string, input: { dataUrl: string }) =>
    request<{ patient: Patient }>(`/centers/${centerId}/patients/${patientId}/photo`, json('POST', input)),
  createEpisode: (centerId: string, input: Partial<WoundEpisode>) =>
    request<{ episode: WoundEpisode }>(`/centers/${centerId}/episodes`, json('POST', input)),
  updateEpisode: (centerId: string, episodeId: string, input: Partial<WoundEpisode>) =>
    request<{ episode: WoundEpisode }>(`/centers/${centerId}/episodes/${episodeId}`, json('PUT', input)),
  createEncounter: (centerId: string, input: Partial<Encounter> & { linkedEncounterId?: string }) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters`, json('POST', input)),
  updateEncounter: (centerId: string, encounterId: string, input: Partial<Encounter> & { version: number }) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters/${encounterId}`, json('PUT', input)),
  uploadPhoto: (centerId: string, encounterId: string, input: { dataUrl: string; kind: 'pre' | 'post'; orientationConfirmed: boolean; scaleIncluded: boolean; measurement?: Omit<PhotoMeasurement, 'method' | 'lengthCm' | 'widthCm' | 'areaCm2'> }) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters/${encounterId}/photos`, json('POST', input)),
  submitPhotoRegistration: (centerId: string, encounterId: string, version: number) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters/${encounterId}/photo-registration/submit`, json('POST', { version })),
  getEncounterPhoto: (centerId: string, encounterId: string, photoId: string) =>
    requestImage(`/centers/${centerId}/encounters/${encounterId}/photos/${photoId}/image`),

  reviewNarrative: (centerId: string, encounterId: string, section: 'nursing' | 'medical', text: string, sourceText: string) =>
    request<{ review: import('../types').NarrativeReview }>(`/centers/${centerId}/encounters/${encounterId}/narratives/${section}`, json('PUT', { text, sourceText })),
  reviewPhoto: (centerId: string, encounterId: string, photoId: string, input: { version: number; quality: 'accepted' | 'repeat'; reason: string }) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters/${encounterId}/photos/${photoId}`, json('PUT', input)),
  addAddendum: (centerId: string, encounterId: string, text: string) =>
    request<{ encounter: Encounter }>(`/centers/${centerId}/encounters/${encounterId}/addenda`, json('POST', { text })),
  createTask: (centerId: string, input: Partial<ClinicalTask>) =>
    request<{ task: ClinicalTask }>(`/centers/${centerId}/tasks`, json('POST', input)),
  updateTask: (centerId: string, taskId: string, input: Partial<ClinicalTask>) =>
    request<{ task: ClinicalTask }>(`/centers/${centerId}/tasks/${taskId}`, json('PUT', input)),
  prepareWhatsApp: (centerId: string, taskId: string) =>
    request<{ url: string; message: string }>(`/centers/${centerId}/tasks/${taskId}/whatsapp`, json('POST', {})),
  uploadAttachment: (centerId: string, episodeId: string, input: { dataUrl: string; kind: ClinicalAttachment['kind']; title: string }) =>
    request<{ attachment: ClinicalAttachment }>(`/centers/${centerId}/episodes/${episodeId}/attachments`, json('POST', input)),

  listAudit: (centerId: string) => request<{ events: AuditEvent[] }>(`/centers/${centerId}/audit`),
};
