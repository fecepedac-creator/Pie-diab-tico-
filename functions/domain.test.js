const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidRut, sanitizeRoles, cleanDetailMap, nursingNarrative, medicalNarrative } = require('./domain');

test('valida RUT chileno sin depender del formato', () => {
  assert.equal(isValidRut('12.345.678-5'), true);
  assert.equal(isValidRut('12.345.678-9'), false);
});

test('descarta roles desconocidos y duplicados', () => {
  assert.deepEqual(sanitizeRoles(['doctor', 'root', 'doctor', 'tens']), ['doctor', 'tens']);
});

test('conserva detalles clínicos sólo para antecedentes seleccionados', () => {
  assert.deepEqual(cleanDetailMap({ 'DM-2': ['Hace 10 años', ''], HTA: ['2015'], extra: ['no guardar'] }, ['DM-2', 'HTA']), { 'DM-2': ['Hace 10 años'], HTA: ['2015'] });
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

test('la evolución de curación respeta el orden y sólo relata hallazgos registrados', () => {
  const encounter = {
    episodeLocation: 'zona plantar', episodeSide: 'left',
    wound: {
      lengthCm: 1, widthCm: 0.3, granulationPercent: 50, sloughPercent: 50,
      edges: ['Macerados'], periwound: ['Eritematosa'], infectionSigns: [], exposedStructures: [],
      pockets: [{ direction: 'plantar', depthCm: 1 }, { direction: 'dorsal', depthCm: 0.5 }],
      probeDepthCm: 1, boneContact: 'yes', pedalPulse: 'absent', notes: 'Placa necrótica bajo uña',
    },
    nursing: {
      verification: { status: 'confirmed' }, removedDressingLevel: 'secundario', removedDressingContent: 'contenido turbio',
      irrigationTechnique: 'duchaterapia', initialIrrigation: 'suero fisiológico 0,9 % y jabón neutro',
      repeatIrrigation: 'suero fisiológico 0,9 %', dryingMaterial: 'gasa tradicional',
      cleanser: 'solución limpiadora de ácido hipocloroso', cleanserCarrier: 'gasa no tejida', cleanserMinutes: 3,
      repeatCleanserMinutes: 3, debridementDetails: 'Se retira fibrina con pinza y bisturí',
      debridement: [], periwoundProtection: ['Protector cutáneo'], primaryDressings: ['DACC'],
      secondaryDressings: ['Gasa tradicional'], fixation: 'venda semielasticada y tela de rayón',
    },
  };
  const text = nursingNarrative(encounter);
  assert.match(text, /apósitos pasados hasta secundario con contenido turbio/);
  assert.match(text, /Bolsillos: plantar 1 cm, dorsal 0.5 cm/);
  assert.match(text, /contacto óseo/);
  assert.match(text, /Pulso pedio ausente/);
  assert.match(text, /Placa necrótica bajo uña/);
  assert.ok(text.indexOf('Se irriga') < text.indexOf('Se observa'));
  assert.ok(text.indexOf('Se retira fibrina') < text.indexOf('Se vuelve a aplicar'));
  assert.ok(text.indexOf('Se vuelve a aplicar') < text.indexOf('En el lecho'));
  assert.doesNotMatch(text, /olor|dolor|educación/i);
});
