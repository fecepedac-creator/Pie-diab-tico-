function fail(message) {
  console.error(`[FAIL] ${message}`);
  throw new Error(message);
}

function pass(message) {
  console.log(`[PASS] ${message}`);
}

function assert(cond, message) {
  if (!cond) fail(message);
  else pass(message);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  let base = process.env.PD_PROD_BASE_URL || 'https://policlinico-de-pie-diabetico.web.app';
  if (args.includes('--canary')) {
    const canaryId = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', '.firebaserc'), 'utf8')).projects?.canary;
    if (!canaryId || ['policlinico-de-pie-diabetico', 'simulador-clinico', 'simulador-clinico-2'].includes(canaryId)) throw new Error('Configura un proyecto canary exclusivo para Pie Diabético.');
    return { base: `https://${canaryId}.web.app`, strict };
  }
  const baseIndex = args.indexOf('--base');
  if (baseIndex >= 0 && args[baseIndex + 1]) {
    base = args[baseIndex + 1];
  } else if (args[0] && !args[0].startsWith('--')) {
    base = args[0];
  }
  return { base: base.replace(/\/$/, ''), strict };
}

function containsBlockedPatterns(text, patterns) {
  const hay = String(text || '');
  return patterns.some((pattern) => hay.includes(pattern));
}

async function main() {
  const { base, strict } = parseArgs();
  console.log(`Verificando base: ${base}`);

  const checks = [
    ['health', '/api/health', { check: async (r) => {
      assert(r.status === 200, `/api/health status 200 (actual ${r.status})`);
      const body = await r.text();
      const json = (() => { try { return JSON.parse(body); } catch { return null; } })();
      if (!json || json.status !== 'ok') {
        fail('/api/health no devuelve { status: \"ok\" }');
      } else {
        pass('/api/health body esperado');
      }
    } }],
    ['session', '/api/session', { check: async (r) => {
      assert(r.status === 401, `/api/session sin token status 401 (actual ${r.status})`);
      const body = await r.text();
      assert(body.includes('Tu sesión no es válida o venció.') || body.includes('error'), '/api/session sin token responde error de sesión');
    } }],
    ['home', '/', { check: async (r) => {
      assert(r.status === 200, `Home status 200 (actual ${r.status})`);
      const text = await r.text();
      const hasJs = /<script[^>]*src=['"][^'"]+\.js['"][^>]*>/i.test(text);
      assert(hasJs, 'Home incluye al menos un bundle JS');
    } }],
  ];

  const blockedPatterns = ['localhost:4000', 'generativelanguage.googleapis.com'];
  if (process.env.PD_BLOCKED_BUNDLE_STRING) blockedPatterns.push(process.env.PD_BLOCKED_BUNDLE_STRING);
  const responses = {};

  for (const [name, path, meta] of checks) {
    const url = `${base}${path}`;
    const response = await fetch(url);
    responses[name] = response;
    await meta.check(response.clone());
  }

  const homeText = await responses.home.text();
  const jsMatch = /src=['"]([^'"]+\.js)['"]/i.exec(homeText);
  assert(Boolean(jsMatch), 'Se encontró referencia de bundle JS');

  if (jsMatch) {
    const jsUrl = jsMatch[1].startsWith('http') ? jsMatch[1] : `${base}${jsMatch[1]}`;
    const bundleRes = await fetch(jsUrl);
    assert(bundleRes.status === 200, `Descarga de bundle JS (status 200)`);
    const bundleText = await bundleRes.text();
    const hasBlocked = containsBlockedPatterns(bundleText, blockedPatterns);
    assert(!hasBlocked, `Bundle sin patrones sensibles (${blockedPatterns.join(', ')})`);
  }

  const corsUrl = `${base}/api/health`;
  const corsRes = await fetch(corsUrl, { headers: { Origin: 'https://example.test' } });
  assert(corsRes.status === 200, `CORS-health responde 200 con Origin de prueba`);
  if (strict) {
    const corsOrigin = corsRes.headers.get('access-control-allow-origin');
    assert(corsOrigin === 'https://example.test' || !corsOrigin, 'Origin reflejada correctamente o sin CORS explícito (esperado según entorno)');
  } else {
    pass('CORS estricto desactivado en modo normal');
  }

  console.log('Readiness check finalizado OK.');
}

main().catch((error) => {
  console.error('[ERROR]', error?.message || error);
  process.exitCode = 1;
});
