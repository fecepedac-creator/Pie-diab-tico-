import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const mode = process.argv[2];
assert.ok(['normal', 'diagnostic'].includes(mode), 'mode must be normal or diagnostic');
const files = readdirSync('dist/assets').filter((name) => name.endsWith('.js'));
assert.ok(files.length > 0);
const scripts = files.map((name) => readFileSync(join('dist/assets', name), 'utf8')).join('\n');
const markers = ['t6_security_event', 't6-no-center', 'Diagnóstico temporal T6', 'X-Request-Id'];
for (const marker of markers) assert.equal(scripts.includes(marker), mode === 'diagnostic', `${marker} in ${mode} build`);
for (const forbidden of ['T6_TEST_TOKEN_DO_NOT_BUNDLE', 'T6_INVALID_TOKEN_SENTINEL', 'tens.prueba@hospital.cl']) {
  assert.equal(scripts.includes(forbidden), false, `forbidden marker ${forbidden}`);
}
console.log(`T6 ${mode} artifact gate passed (${files.length} JS files).`);
