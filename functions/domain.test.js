const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidRut, sanitizeRoles, nursingNarrative, medicalNarrative } = require('./domain');

test('valida RUT chileno sin depender del formato', () => {
  assert.equal(isValidRut('12.345.678-5'), true);
  assert.equal(isValidRut('12.345.678-9'), false);
});

test('descarta roles desconocidos y duplicados', () => {
  assert.deepEqual(sanitizeRoles(['doctor', 'root', 'doctor', 'tens']), ['doctor', 'tens']);
});

test('las narrativas incorporan una única medición compartida', () => {
  const encounter = {
    wound: { lengthCm: 2, widthCm: 1, depthCm: 0.5, edges: [], periwound: [], infectionSigns: [], verification: { status: 'draft' } },
    wifi: { verification: { status: 'draft' } },
    nursing: { cleaning: ['suero fisiológico'], debridement: [], primaryDressings: [], secondaryDressings: [], periwoundProtection: [], advancedTherapies: [], offloadingApplied: [], education: [], verification: { status: 'draft' } },
    medical: { requestedTests: [], verification: { status: 'draft' } },
  };
  assert.match(nursingNarrative(encounter), /2 x 1 x 0.5 cm/);
  assert.match(medicalNarrative(encounter), /2 x 1 x 0.5 cm/);
  assert.match(medicalNarrative(encounter), /no se calcula automáticamente/);
});
