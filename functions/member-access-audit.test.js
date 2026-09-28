const test = require('node:test');
const assert = require('node:assert/strict');
const { accessReason, operationId, requestHash, accessState, isReplay } = require('./member-access-audit');

test('administrative reason is required and excludes common patient identifiers', () => {
  assert.equal(accessReason('  Ingreso   al equipo de enfermería  '), 'Ingreso al equipo de enfermería');
  for (const reason of [undefined, '   ', 'corto', 'a'.repeat(201), 'Paciente 12.345.678-9', 'Ficha 12345678', 'Ver https://example.org', 'paciente@ejemplo.cl']) {
    assert.throws(() => accessReason(reason), { status: 400 });
  }
});

test('operation identity and replay require the same actor, action, target and request', () => {
  const id = 'A6D09864-774A-42E7-8A00-28AF2BB552AA';
  assert.equal(operationId(id), id.toLowerCase());
  assert.throws(() => operationId('../auditLogs/other'), { status: 400 });
  const hash = requestHash({ roles: ['nurse'], reason: 'Ingreso al equipo de enfermería' });
  const event = { result: 'succeeded', actorUid: 'verified-uid', action: 'member.updated', targetId: 'member-1', requestHash: hash };
  assert.equal(isReplay(event, { uid: 'verified-uid' }, 'member.updated', 'member-1', hash), true);
  assert.equal(isReplay(event, { uid: 'other' }, 'member.updated', 'member-1', hash), false);
  assert.equal(isReplay(event, { uid: 'verified-uid' }, 'member.updated', 'member-2', hash), false);
  assert.equal(isReplay(event, { uid: 'verified-uid' }, 'member.updated', 'member-1', requestHash({ roles: ['doctor'] })), false);
  assert.deepEqual(accessState({ uid: 'private', email: 'private@example.org', roles: ['nurse'], status: 'active' }), { roles: ['nurse'], status: 'active' });
});
