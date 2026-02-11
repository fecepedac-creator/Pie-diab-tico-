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
    return request<{ token: string; user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
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
  async uploadPhoto(token: string, dataUrl: string, filename: string) {
    return request<{ url: string }>('/api/uploads/photo', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ dataUrl, filename }),
    });
  },
};
