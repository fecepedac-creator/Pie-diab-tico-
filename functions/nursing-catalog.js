const defaults = require('./nursing-catalog-defaults.json');
const sections = Object.keys(defaults);

function invalid(message) { throw Object.assign(new Error(message), { status: 400 }); }

function validateOptions(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).length !== sections.length || Object.keys(input).some((key) => !sections.includes(key))) invalid('El catálogo debe contener únicamente las ocho secciones de curación.');
  const options = {};
  for (const key of sections) {
    const values = input[key];
    if (!Array.isArray(values) || values.length > 30) invalid(`Opciones inválidas en ${key}.`);
    const normalized = values.map((value) => {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(value)) invalid(`Término inválido en ${key}.`);
      return value.trim();
    });
    if (new Set(normalized.map((value) => value.toLocaleLowerCase('es'))).size !== normalized.length) invalid(`Hay términos repetidos en ${key}.`);
    if (key === 'debridement' && !normalized.includes('No realizado')) invalid('Conserva «No realizado» en desbridamiento para mantener la validación clínica.');
    options[key] = normalized;
  }
  return options;
}

function catalogFromData(data) {
  return {
    revision: data?.revision || 0,
    options: data?.options || defaults,
  };
}

module.exports = { defaults, sections, validateOptions, catalogFromData };
