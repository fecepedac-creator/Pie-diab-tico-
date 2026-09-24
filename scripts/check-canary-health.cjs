const https = require('https');

const defaultTargets = [
  'https://policlinico-de-pie-diabetico.web.app',
  'https://simulador-clinico.web.app',
  'https://simulador-clinico-2.web.app',
];

function normalizeTarget(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, '');
}

const targets = process.env.PD_CANARY_CHECK_TARGETS
  ? process.env.PD_CANARY_CHECK_TARGETS
      .split(',')
      .map((value) => normalizeTarget(value))
      .filter(Boolean)
  : defaultTargets;

function fetchStatus(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { timeout: 12000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const rawStatus = res.statusCode;
        let parsed = null;
        let hasJson = false;
        let healthOk = false;
        try {
          parsed = JSON.parse(body);
          hasJson = true;
          if (parsed && parsed.status === 'ok') healthOk = true;
        } catch {
          hasJson = false;
        }
        resolve({
          url,
          status: rawStatus,
          hasJson,
          healthOk,
          payload: parsed,
          sample: (body || '').slice(0, 200),
          contentType: res.headers['content-type'] || '',
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
      resolve({ url, status: null, error: 'timeout' });
    });

    req.on('error', (error) => {
      resolve({ url, status: null, error: String(error.message || error) });
    });
  });
}

async function main() {
  const rows = [];
  for (const base of targets) {
    const normalizedBase = base.replace(/\/$/, '');
    const hasHealthPath = /\/api\/health$/i.test(normalizedBase);
    const healthUrl = hasHealthPath ? normalizedBase : `${normalizedBase}/api/health`;
    rows.push(await fetchStatus(healthUrl));
  }

  const passRows = rows.map((entry) => ({
    base: entry.url,
    status: entry.status ?? null,
    healthOk: !!entry.healthOk,
    hasJson: !!entry.hasJson,
    contentType: entry.contentType || null,
    error: entry.error || null,
    sample: entry.sample ? entry.sample.replace(/\s+/g, ' ').trim() : null,
    payload: entry.payload || null,
  }));

  console.log(JSON.stringify(passRows, null, 2));
  const fs = require('fs');
  const outPath = 'docs/_canary-health-latest.json';
  fs.writeFileSync(outPath, JSON.stringify({ checkedAt: new Date().toISOString(), rows: passRows }, null, 2));
  console.log(`Guardado: ${outPath}`);

  const failed = passRows.filter((row) => row.status !== 200 || row.healthOk !== true);
  if (failed.length > 0) {
    console.log(`Resultado: ${failed.length} objetivo(s) pendientes de canary`);
    process.exitCode = 1;
  } else {
    console.log('Resultado: todos los objetivos de canary en OK');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
