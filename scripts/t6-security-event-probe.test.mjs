import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../diagnostics/securityEventProbe.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { isEligibleTensSession, runT6SecurityEventProbe, T6_REQUESTS } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);
const origin = 'https://pie-diabetico-canary-2026.web.app';
const token = 'T6_TEST_TOKEN_DO_NOT_BUNDLE';
const ids = [1, 2, 3].map((i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);

test('only the current active single-role TENS membership enables the probe', () => {
  const session = {
    user: { uid: 'synthetic-tens' },
    platformAdmin: false,
    memberships: [{ centerId: 'canary-centro-01', uid: 'synthetic-tens', status: 'active', roles: ['tens'] }],
    centers: [{ id: 'canary-centro-01', status: 'active' }],
  };
  assert.equal(isEligibleTensSession(session, 'synthetic-tens'), true);
  assert.equal(isEligibleTensSession(session, 'another-user'), false);
  assert.equal(isEligibleTensSession({ ...session, platformAdmin: true }, 'synthetic-tens'), false);
  assert.equal(isEligibleTensSession({ ...session, memberships: [{ ...session.memberships[0], roles: ['tens', 'nurse'] }] }, 'synthetic-tens'), false);
  assert.equal(isEligibleTensSession({ ...session, memberships: [{ ...session.memberships[0], status: 'disabled' }] }, 'synthetic-tens'), false);
  assert.equal(isEligibleTensSession({ ...session, centers: [{ id: 'canary-centro-01', status: 'archived' }] }, 'synthetic-tens'), false);
});

test('fixed same-origin GET whitelist, bearer only in memory, no response body read', async () => {
  const paths = [
    '/api/session',
    '/api/centers/canary-centro-01/audit',
    '/api/centers/t6-no-center/state',
  ];
  assert.deepEqual(T6_REQUESTS.map((item) => item.path), paths);
  const calls = [];
  const results = [];
  let parsed = 0;
  let canceled = 0;
  await runT6SecurityEventProbe(token, origin, (result) => results.push(result), async (url, options) => {
    calls.push({ url, options });
    return {
      status: calls.length === 1 ? 200 : 403,
      headers: new Headers({ 'X-Request-Id': ids[calls.length - 1] }),
      body: { cancel: async () => { canceled += 1; } },
      json: () => { parsed += 1; throw new Error('body read'); },
      text: () => { parsed += 1; throw new Error('body read'); },
    };
  });
  assert.deepEqual(calls.map(({ url }) => new URL(url).pathname), paths);
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, origin);
    assert.equal(options.method, 'GET');
    assert.equal(options.mode, 'same-origin');
    assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.deepEqual(options.headers, { Authorization: `Bearer ${token}` });
  }
  assert.equal(parsed, 0);
  assert.equal(canceled, 3);
  assert.deepEqual(results.map(({ status, requestId }) => [status, requestId]), [[200, ids[0]], [403, ids[1]], [403, ids[2]]]);
  assert.equal(JSON.stringify(results).includes(token), false);
});

test('fail closed on unexpected status or missing request ID without further GETs', async () => {
  for (const response of [
    { status: 401, headers: new Headers({ 'X-Request-Id': ids[0] }) },
    { status: 200, headers: new Headers() },
  ]) {
    let calls = 0;
    await assert.rejects(runT6SecurityEventProbe(token, origin, () => undefined, async () => {
      calls += 1;
      return response;
    }), /Diagnóstico no disponible/);
    assert.equal(calls, 1);
  }
});

test('invalid origin or empty token sends no request', async () => {
  let calls = 0;
  const fetchRequest = async () => { calls += 1; throw new Error('should not fetch'); };
  await assert.rejects(runT6SecurityEventProbe(token, 'https://evil.example/path', () => undefined, fetchRequest));
  await assert.rejects(runT6SecurityEventProbe('', origin, () => undefined, fetchRequest));
  assert.equal(calls, 0);
});
