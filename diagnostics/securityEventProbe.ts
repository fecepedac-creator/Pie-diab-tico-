// Temporary T6 harness. No API client, response parser, storage, or logging is used here.
import type { SessionInfo } from '../types';

export function isEligibleTensSession(session: SessionInfo, currentUid: string | undefined): boolean {
  const member = session.memberships.find((item) => item.centerId === 'canary-centro-01');
  const center = session.centers.find((item) => item.id === 'canary-centro-01');
  return Boolean(
    currentUid
    && currentUid === session.user.uid
    && member?.uid === currentUid
    && member.status === 'active'
    && member.roles.length === 1
    && member.roles[0] === 'tens'
    && center?.status === 'active'
    && !session.platformAdmin,
  );
}

export const T6_REQUESTS = [
  { label: 'Sesión TENS', path: '/api/session', expectedStatus: 200 },
  { label: 'Auditoría denegada', path: '/api/centers/canary-centro-01/audit', expectedStatus: 403 },
  { label: 'Centro inexistente', path: '/api/centers/t6-no-center/state', expectedStatus: 403 },
] as const;

export type T6ProbeResult = { label: string; status: number; requestId: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function runT6SecurityEventProbe(
  token: string,
  origin: string,
  onResult: (result: T6ProbeResult) => void,
  fetchRequest: typeof fetch = fetch,
): Promise<void> {
  if (!token || !origin || new URL(origin).origin !== origin) throw new Error('Diagnóstico no disponible.');

  for (const request of T6_REQUESTS) {
    const url = new URL(request.path, origin);
    if (url.origin !== origin) throw new Error('Diagnóstico no disponible.');
    const response = await fetchRequest(url.href, {
      method: 'GET',
      mode: 'same-origin',
      redirect: 'error',
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      headers: { Authorization: `Bearer ${token}` },
    });
    // Cancel without parsing or rendering any response body, including /session.
    void response.body?.cancel().catch(() => undefined);
    const requestId = response.headers.get('X-Request-Id') || '';
    if (!UUID.test(requestId)) throw new Error('Diagnóstico no disponible.');
    onResult({ label: request.label, status: response.status, requestId });
    if (response.status !== request.expectedStatus) throw new Error('Diagnóstico no disponible.');
  }
}
