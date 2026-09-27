const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validatePhotoMeasurement } = require('./photo-measurement');

const geometry = {
  imageWidth: 1000, imageHeight: 1000, referenceLengthCm: 1,
  reference: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }],
  length: [{ x: 0.3, y: 0.3 }, { x: 0.55, y: 0.3 }],
  width: [{ x: 0.4, y: 0.3 }, { x: 0.4, y: 0.42 }],
  outline: [{ x: 0.3, y: 0.3 }, { x: 0.55, y: 0.3 }, { x: 0.55, y: 0.42 }, { x: 0.3, y: 0.42 }],
};

test('calibración manual calcula largo, ancho y área en cm', () => {
  const result = validatePhotoMeasurement(geometry);
  assert.equal(result.lengthCm, 2.5);
  assert.equal(result.widthCm, 1.2);
  assert.equal(result.areaCm2, 3);
  assert.equal(result.method, 'manual-calibrated-2d');
});

test('rechaza una referencia demasiado corta y coordenadas inválidas', () => {
  assert.throws(() => validatePhotoMeasurement({ ...geometry, reference: [{ x: 0.1, y: 0.1 }, { x: 0.101, y: 0.1 }] }), /calibración/);
  assert.throws(() => validatePhotoMeasurement({ ...geometry, length: [{ x: -0.1, y: 0.3 }, { x: 0.5, y: 0.3 }] }), /calibración/);
});
