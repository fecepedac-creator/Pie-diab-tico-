const test = require('node:test');
const assert = require('node:assert/strict');
const { securityEvent, routeFamily } = require('./security-events');

test('anonymous and invalid-token denials carry no actor or center', () => {
  const req = {
    apiRequestId: 'server-generated-request-id',
    method: 'GET',
    path: '/api/centers/foreign-center/patients/patient-secret/episodes/episode-secret',
    headers: { authorization: 'Bearer secret-token' },
    body: { name: 'private patient' },
  };
  const event = securityEvent(req, 'access.denied', 401, 'invalid_token');
  assert.deepEqual(event, {
    event: 'access.denied', requestId: 'server-generated-request-id', status: 401,
    actorUid: null, centerId: null, method: 'GET', route: 'center.patients', reason: 'invalid_token',
  });
  assert.equal(JSON.stringify(event).includes('secret'), false);
  assert.equal(JSON.stringify(event).includes('foreign-center'), false);
  assert.equal(securityEvent({ ...req, verifiedActorUid: 'stale-uid', authorizedCenterId: 'stale-center' }, 'access.denied', 401, 'invalid_token').actorUid, null);
  assert.equal(securityEvent({ ...req, verifiedActorUid: 'stale-uid', authorizedCenterId: 'stale-center' }, 'access.denied', 401, 'invalid_token').centerId, null);
});

test('verified actor without membership is kept outside the foreign center log', () => {
  const req = {
    apiRequestId: 'server-generated-request-id', method: 'GET',
    path: '/centers/foreign-center/audit', verifiedActorUid: 'firebase-uid',
  };
  assert.deepEqual(securityEvent(req, 'access.denied', 403, 'membership_inactive'), {
    event: 'access.denied', requestId: 'server-generated-request-id', status: 403,
    actorUid: 'firebase-uid', centerId: null, method: 'GET', route: 'center.audit', reason: 'membership_inactive',
  });
});

test('role denial names the center only after membership was verified', () => {
  const req = {
    apiRequestId: 'server-generated-request-id', method: 'POST',
    path: '/centers/allowed-center/members', verifiedActorUid: 'firebase-uid',
    authorizedCenterId: 'allowed-center',
  };
  assert.equal(securityEvent(req, 'access.denied', 403, 'insufficient_role').centerId, 'allowed-center');
  assert.equal(securityEvent(req, 'access.denied', 403, 'unsafe raw message').reason, 'authorization_denied');
});

test('validated session is an API signal without a center or Firebase-login claim', () => {
  const req = { apiRequestId: 'server-generated-request-id', method: 'GET', path: '/api/session', verifiedActorUid: 'firebase-uid' };
  assert.deepEqual(securityEvent(req, 'session.validated', 200, 'session_validated'), {
    event: 'session.validated', requestId: 'server-generated-request-id', status: 200,
    actorUid: 'firebase-uid', centerId: null, method: 'GET', route: 'session', reason: 'session_validated',
  });
  assert.equal(routeFamily('/api/centers/secret/encounters/clinical-id/photos/photo-id/image'), 'center.encounters');
});
