function invalid() {
  return Object.assign(new Error('Revisa la calibración y las marcas de la fotografía.'), { status: 400 });
}

function point(value) {
  if (!value || typeof value !== 'object' || !Number.isFinite(value.x) || !Number.isFinite(value.y) || value.x < 0 || value.x > 1 || value.y < 0 || value.y > 1) throw invalid();
  return { x: value.x, y: value.y };
}

function line(value) {
  if (!Array.isArray(value) || value.length !== 2) throw invalid();
  return [point(value[0]), point(value[1])];
}

function distance([start, end], imageWidth, imageHeight) {
  return Math.hypot((end.x - start.x) * imageWidth, (end.y - start.y) * imageHeight);
}

function polygonArea(points, imageWidth, imageHeight) {
  let sum = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    sum += points[index].x * next.y - next.x * points[index].y;
  }
  return Math.abs(sum) * imageWidth * imageHeight / 2;
}

function validatePhotoMeasurement(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid();
  const { imageWidth, imageHeight, referenceLengthCm } = input;
  if (!Number.isInteger(imageWidth) || !Number.isInteger(imageHeight) || imageWidth < 100 || imageHeight < 100 || imageWidth > 12000 || imageHeight > 12000 || !Number.isFinite(referenceLengthCm) || referenceLengthCm < 0.1 || referenceLengthCm > 20) throw invalid();
  const reference = line(input.reference);
  const length = line(input.length);
  const width = line(input.width);
  const referencePixels = distance(reference, imageWidth, imageHeight);
  if (referencePixels < 12) throw invalid();
  const cmPerPixel = referenceLengthCm / referencePixels;
  const lengthCm = distance(length, imageWidth, imageHeight) * cmPerPixel;
  const widthCm = distance(width, imageWidth, imageHeight) * cmPerPixel;
  if (lengthCm < 0.05 || widthCm < 0.05 || lengthCm > 100 || widthCm > 100) throw invalid();
  let outline;
  let areaCm2;
  if (input.outline !== undefined) {
    if (!Array.isArray(input.outline) || input.outline.length < 3 || input.outline.length > 64) throw invalid();
    outline = input.outline.map(point);
    areaCm2 = polygonArea(outline, imageWidth, imageHeight) * cmPerPixel * cmPerPixel;
    if (areaCm2 < 0.01 || areaCm2 > 10000) throw invalid();
  }
  return {
    method: 'manual-calibrated-2d', imageWidth, imageHeight, referenceLengthCm,
    reference, length, width, ...(outline ? { outline } : {}),
    lengthCm: Math.round(lengthCm * 100) / 100,
    widthCm: Math.round(widthCm * 100) / 100,
    ...(areaCm2 === undefined ? {} : { areaCm2: Math.round(areaCm2 * 100) / 100 }),
  };
}

module.exports = { validatePhotoMeasurement };
