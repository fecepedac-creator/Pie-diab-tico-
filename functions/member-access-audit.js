const crypto = require('node:crypto');

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function accessReason(value) {
  if (typeof value !== 'string') throw badRequest('Indica un motivo breve para este cambio de acceso.');
  const reason = value.trim().replace(/\s+/g, ' ');
  if (reason.length < 10 || reason.length > 200) throw badRequest('El motivo debe tener entre 10 y 200 caracteres.');
  // These checks catch common accidental identifiers; the UI also asks for an administrative reason only.
  if (/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(reason) || /\b(?:\d{1,2}\.?)?\d{3}\.?(?:\d{3})-[\dkK]\b/.test(reason) || /\b\d{6,}\b/.test(reason) || /https?:\/\//i.test(reason)) {
    throw badRequest('No incluyas correos, RUT, números de ficha ni enlaces en el motivo.');
  }
  return reason;
}

function operationId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw badRequest('Identificador de operación inválido. Actualiza la página e inténtalo nuevamente.');
  }
  return value.toLowerCase();
}

function requestHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function accessState(member) {
  return member ? { status: member.status, roles: member.roles } : null;
}

function isReplay(event, actor, action, targetId, hash) {
  return event?.result === 'succeeded' && event.actorUid === actor.uid && event.action === action
    && event.targetId === targetId && event.requestHash === hash;
}

module.exports = { accessReason, operationId, requestHash, accessState, isReplay };
