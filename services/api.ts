import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  async register(email: string, password: string, role: string) {
    return request<{ ok: boolean }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  },
  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();

    // We need to get the role. By convention in this app, we'll assume 
    // it's in the custom claims or we'll fetch it from Firestore.
    // For now, let's just return what we have.
    const idTokenResult = await user.getIdTokenResult();
    const role = (idTokenResult.claims.role as string) || 'Médico Diabetología';

    return {
      token,
      user: {
        id: user.uid,
        email: user.email!,
        role
      }
    };
  },
  async getState(token: string) {
    return request<{ patients: any[]; episodes: any[]; visits: any[]; referrals: any[] }>('/api/state', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async saveState(token: string, state: { patients: any[]; episodes: any[]; visits: any[]; referrals: any[] }) {
    return request<{ ok: boolean }>('/api/state', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(state),
    });
  },
  async updatePatient(token: string, patient: any) {
    // In Phase 1 (mock/local), we might just rely on saveState, but let's add a specific endpoint if we were full backend.
    // Since server/index.js just does saveState (bulk), we can technically just use saveState in App.tsx.
    // BUT to keep it clean, let's pretend we have a method.
    // Actually, App.tsx manages state and calls saveState. 
    // So this is strictly for when we move to granular updates.
    // For now, return true.
    return Promise.resolve({ ok: true });
  },
  async uploadPhoto(token: string, dataUrl: string, filename: string) {
    return request<{ url: string }>('/api/uploads/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dataUrl, filename }),
    });
  },
  async getClinicalConfig(token: string) {
    return request<any>('/api/settings/clinical', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async saveClinicalConfig(token: string, config: any) {
    return request<{ ok: boolean }>('/api/settings/clinical', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(config),
    });
  },
};
