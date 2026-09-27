const test = require('node:test');
const assert = require('node:assert/strict');
const { defaults, validateOptions, catalogFromData } = require('./nursing-catalog');

test('el catálogo inicial conserva las opciones existentes', () => {
  assert.deepEqual(catalogFromData(undefined), { revision: 0, options: defaults });
});

test('permite adaptar opciones del centro sin aceptar estructuras o términos inválidos', () => {
  const options = { ...defaults, cleaning: ['Limpieza propia'], primaryDressings: [] };
  assert.deepEqual(validateOptions(options), options);
  assert.throws(() => validateOptions({ ...options, extra: [] }), { status: 400 });
  assert.throws(() => validateOptions({ ...options, cleaning: ['Igual', 'igual'] }), { status: 400 });
  assert.throws(() => validateOptions({ ...options, cleaning: [''] }), { status: 400 });
  assert.throws(() => validateOptions({ ...options, debridement: ['Cortante conservador'] }), { status: 400 });
});
