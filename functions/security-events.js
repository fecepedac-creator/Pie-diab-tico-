// Only fixed route families and reason codes belong in security logs. Request
// paths, headers, bodies and exception messages can contain clinical data.
const REASONS = new Set([
  'session_validated', 'missing_token', 'invalid_token', 'unverified_email',
  'center_inactive', 'membership_inactive', 'membership_identity_mismatch',
  'insufficient_role', 'authorization_denied',
]);

function routeFamily(path) {
  const normalized = String(path || '').replace(/^\/api/, '');
  if (normalized === '/session') return 'session';
  if (/^\/platform(?:\/|$)/.test(normalized)) return 'platform';
  const centerRoute = normalized.match(/^\/centers\/[^/]+(?:\/([^/]+))?/);
  if (centerRoute) {
    const area = centerRoute[1];
    return ['state', 'members', 'audit', 'patients', 'episodes', 'encounters', 'tasks', 'attachments', 'settings'].includes(area)
      ? `center.${area}` : 'center.other';
  }
  return 'other';
}

function securityEvent(req, event, status, reason) {
  const safeReason = REASONS.has(reason) ? reason : 'authorization_denied';
  return {
    event,
    requestId: req.apiRequestId,
    status,
    actorUid: status === 401 ? null : req.verifiedActorUid || null,
    centerId: status === 401 ? null : req.authorizedCenterId || null,
    method: ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method) ? req.method : 'OTHER',
    route: routeFamily(req.path),
    reason: safeReason,
  };
}

module.exports = { routeFamily, securityEvent };
