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
  async getCenters(token: string) {
    return request<{ centers: any[]; memberships: Record<string, { roles: string[]; isActive: boolean }> }>('/api/centers', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async getState(token: string, activeCenterId: string) {
    return request<{ patients: any[]; episodes: any[]; visits: any[]; referrals: any[] }>(`/api/state?centerId=${encodeURIComponent(activeCenterId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async saveState(token: string, activeCenterId: string, state: { patients: any[]; episodes: any[]; visits: any[]; referrals: any[] }) {
    return request<{ ok: boolean }>('/api/state', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...state, centerId: activeCenterId }),
    });
  },
  async uploadPhoto(token: string, dataUrl: string, filename: string) {
    return request<{ url: string }>('/api/uploads/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dataUrl, filename }),
    });
  },
  async getClinicalConfig(token: string, activeCenterId: string) {
    return request<any>(`/api/settings/clinical?centerId=${encodeURIComponent(activeCenterId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async saveClinicalConfig(token: string, activeCenterId: string, config: any) {
    return request<{ ok: boolean }>('/api/settings/clinical', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...config, centerId: activeCenterId }),
    });
  },
};
