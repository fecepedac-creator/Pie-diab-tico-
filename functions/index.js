const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const crypto = require('node:crypto');
const logger = require('firebase-functions/logger');
const { routeFamily, securityEvent } = require('./security-events');
const workflow = require('./clinical-workflow');
const nursingCatalog = require('./nursing-catalog');
const { validatePhotoMeasurement } = require('./photo-measurement');
const { accessReason, operationId, requestHash, accessState, isReplay } = require('./member-access-audit');

const {
  CLINICAL_ROLES, cleanText, cleanEmail, hashEmail, normalizeRut,
  isValidRut, cleanStringArray, cleanDetailMap, sanitizeRoles, stamp, emptyWound, emptyWifi,
  emptyNursing, emptyMedical, nursingNarrative, medicalNarrative,
} = require('./domain');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const FALLBACK_ALLOWED_ORIGINS = new Set([
  'https://policlinico-de-pie-diabetico.web.app',
  'https://policlinico-de-pie-diabetico.firebaseapp.com',
  'https://policlinico-pie--policlinico-de-pie-diabetico.us-east4.hosted.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5002',
  'https://localhost:5173',
]);

const CONFIG_ALLOWED_ORIGINS = new Set(
  String(process.env.PD_CORS_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
);

function splitAllowedDomains(source) {
  return String(source || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toLowerCase());
}

function normalizeOrigin(value) {
  if (!value) return undefined;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return undefined;
  }
}

function originHost(value) {
  if (!value) return undefined;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function centerIdFromPath(path) {
  const match = String(path || '').match(/^\/?(?:api\/)?(?:centers|public\/centers)\/([^/]+)\//);
  return match ? match[1] : undefined;
}

function hostMatches(host, candidate) {
  const normalized = String(candidate || '').trim().toLowerCase();
  if (!host || !normalized) return false;
  const candidateHost = normalized.startsWith('http://') || normalized.startsWith('https://') ? originHost(normalized) : normalized;
  if (!candidateHost) return false;
  return host === candidateHost || host.endsWith(`.${candidateHost}`);
}


async function isAllowedOrigin(req, res) {
  const origin = req.get('origin');
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  if (FALLBACK_ALLOWED_ORIGINS.has(normalizedOrigin)) return true;
  for (const envOrigin of CONFIG_ALLOWED_ORIGINS) if (hostMatches(normalizedOrigin, envOrigin) || normalizedOrigin === envOrigin) return true;

  const centerId = centerIdFromPath(req.path);
  if (!centerId) return false;

  const snap = await db.doc(`centers/${centerId}`).get();
  if (!snap.exists) return false;
  const allowed = splitAllowedDomains(snap.data()?.allowedDomains);
  const host = originHost(normalizedOrigin);
  return allowed.some((entry) => hostMatches(host, entry));
}

async function setCors(req, res) {
  if (await isAllowedOrigin(req, res)) {
    const origin = req.get('origin');
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Max-Age', '600');
}

function send(res, status, payload) {
  res.status(status).set('Cache-Control', 'no-store').json(payload);
}

function requestIdFromReq(req) {
  // A client-controlled value may contain identifiers and cannot be trusted
  // as an audit correlation key.
  return crypto.randomUUID();
}

function requestErrorPayload(req, status, error) {
  const code = error?.code || (status >= 500 ? 'internal_error' : 'validation_or_authorization_error');
  const requestId = error?.requestId || crypto.randomUUID();
  const detail = error?.message || 'No fue posible completar la solicitud.';
  const isAuth = status === 401;

  return {
    error: isAuth ? 'Tu sesión no es válida o venció. Inicia sesión nuevamente.' : detail,
    code,
    requestId,
    ...(isAuth ? {} : { message: detail }),
  };
}

async function actorFromRequest(req) {
  const match = (req.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!match) throw Object.assign(new Error('Debes iniciar sesión.'), { status: 401, auditReason: 'missing_token' });
  let decoded;
  try {
    decoded = await auth.verifyIdToken(match[1]);
  } catch (error) {
    throw Object.assign(new Error('Tu sesión no es válida o venció. Inicia sesión nuevamente.'), { status: 401, auditReason: 'invalid_token' });
  }
  req.verifiedActorUid = decoded.uid;
  if (!decoded.email || decoded.email_verified !== true) {
    throw Object.assign(new Error('Se requiere un correo verificado.'), { status: 403, auditReason: 'unverified_email' });
  }
  return { uid: decoded.uid, email: cleanEmail(decoded.email), name: cleanText(decoded.name || decoded.email, 120) };
}

async function isPlatformAdmin(actor) {
  const snap = await db.doc(`platform_admins/${hashEmail(actor.email)}`).get();
  return snap.exists && snap.data().status === 'active';
}

async function membershipFor(centerId, actor) {
  const id = `${centerId}_${hashEmail(actor.email)}`;
  const ref = db.doc(`memberships/${id}`); const centerRef = db.doc(`centers/${centerId}`);
  return db.runTransaction(async (transaction) => {
    const centerSnap = await transaction.get(centerRef); const snap = await transaction.get(ref);
    if (!centerSnap.exists || centerSnap.data().status !== 'active') throw Object.assign(new Error('Este centro no se encuentra activo.'), { status: 403, auditReason: 'center_inactive' });
    if (!snap.exists || snap.data().status === 'disabled' || snap.data().centerId !== centerId) throw Object.assign(new Error('No tienes acceso activo a este centro.'), { status: 403, auditReason: 'membership_inactive' });
    if (snap.data().uid && snap.data().uid !== actor.uid) throw Object.assign(new Error('La invitación está vinculada a otra cuenta.'), { status: 403, auditReason: 'membership_identity_mismatch' });
    const now = new Date().toISOString(); const update = { uid: actor.uid, status: 'active', lastAccessAt: now, updatedAt: now };
    transaction.update(ref, update);
    return { id: snap.id, ...snap.data(), ...update };
  });
}

function requireRole(member, roles) {
  if (!member.roles.some((role) => roles.includes(role))) {
    throw Object.assign(new Error('Tu perfil no permite realizar esta acción.'), { status: 403, auditReason: 'insufficient_role' });
  }
}

function auditIn(writer, centerId, actor, action, targetType, targetId, details = {}) {
  const ref = db.collection(`centers/${centerId}/auditLogs`).doc();
  writer.set(ref, { centerId, action, actorUid: actor.uid, actorEmail: actor.email, targetType, targetId, details, createdAt: new Date().toISOString() });
}

function memberAuditIn(transaction, centerId, actor, action, targetId, operation, requestId, hash, reason, before, after, status) {
  const ref = db.doc(`centers/${centerId}/auditLogs/${operation}`);
  transaction.create(ref, {
    centerId, action, actorUid: actor.uid, actorEmail: actor.email, targetType: 'membership', targetId,
    operationId: operation, requestId, requestHash: hash, reason, before, after,
    result: 'succeeded', httpStatus: status, createdAt: new Date().toISOString(),
  });
}

async function audit(centerId, actor, action, targetType, targetId, details = {}) {
  const batch = db.batch();
  auditIn(batch, centerId, actor, action, targetType, targetId, details);
  await batch.commit();
}

function safeNumber(value, min, max) {
  if (value === '' || value == null) return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return undefined;
  return number;
}

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compact(item)]).filter(([, item]) => item !== undefined));
  }
  return value;
}

function sanitizeWound(input, actor, previous = emptyWound()) {
  const candidate = input || {};
  return compact({
    diameterCm: safeNumber(candidate.diameterCm, 0, 100), lengthCm: safeNumber(candidate.lengthCm, 0, 100), widthCm: safeNumber(candidate.widthCm, 0, 100), depthCm: safeNumber(candidate.depthCm, 0, 30),
    granulationPercent: safeNumber(candidate.granulationPercent, 0, 100), sloughPercent: safeNumber(candidate.sloughPercent, 0, 100), necrosisPercent: safeNumber(candidate.necrosisPercent, 0, 100),
    exudate: ['none', 'low', 'moderate', 'high'].includes(candidate.exudate) ? candidate.exudate : undefined,
    odor: ['none', 'present'].includes(candidate.odor) ? candidate.odor : undefined,
    edges: cleanStringArray(candidate.edges), periwound: cleanStringArray(candidate.periwound), exposedStructures: cleanStringArray(candidate.exposedStructures), infectionSigns: cleanStringArray(candidate.infectionSigns),
    painScore: safeNumber(candidate.painScore, 0, 10),
    pockets: Array.isArray(candidate.pockets) ? candidate.pockets.slice(0, 8).map((item) => ({ direction: cleanText(item?.direction, 60), depthCm: safeNumber(item?.depthCm, 0, 30) })).filter((item) => item.direction || item.depthCm != null) : [],
    probeDepthCm: safeNumber(candidate.probeDepthCm, 0, 30),
    boneContact: ['yes', 'no'].includes(candidate.boneContact) ? candidate.boneContact : undefined,
    pedalPulse: ['present', 'absent'].includes(candidate.pedalPulse) ? candidate.pedalPulse : undefined,
    localColor: cleanText(candidate.localColor, 100), exudateDescription: cleanText(candidate.exudateDescription, 200), notes: cleanText(candidate.notes, 1000),
    verification: stamp(actor, candidate.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification),
  });
}

function sanitizeWifi(input, actor, previous = emptyWifi()) {
  const level = workflow.grade;
  return compact({ wound: level(input?.wound), ischemia: level(input?.ischemia), footInfection: level(input?.footInfection), measuredAt: cleanText(input?.measuredAt, 30), source: cleanText(input?.source, 500), anklePressure: safeNumber(input?.anklePressure, 0, 400), tcpo2: safeNumber(input?.tcpo2, 0, 300), abi: safeNumber(input?.abi, 0, 3), toePressure: safeNumber(input?.toePressure, 0, 300), rationale: cleanText(input?.rationale, 1000), verification: stamp(actor, input?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification) });
}

function sanitizeNursing(input, actor, previous = emptyNursing()) {
  return compact({ removedDressingLevel: cleanText(input?.removedDressingLevel, 80), removedDressingContent: cleanText(input?.removedDressingContent, 200), irrigationTechnique: cleanText(input?.irrigationTechnique, 100), initialIrrigation: cleanText(input?.initialIrrigation, 200), repeatIrrigation: cleanText(input?.repeatIrrigation, 200), dryingMaterial: cleanText(input?.dryingMaterial, 100), cleanser: cleanText(input?.cleanser, 150), cleanserCarrier: cleanText(input?.cleanserCarrier, 100), cleanserMinutes: safeNumber(input?.cleanserMinutes, 0, 60), repeatCleanserMinutes: safeNumber(input?.repeatCleanserMinutes, 0, 60), debridementDetails: cleanText(input?.debridementDetails, 500), fixation: cleanText(input?.fixation, 200), cleaning: cleanStringArray(input?.cleaning), debridement: cleanStringArray(input?.debridement), primaryDressings: cleanStringArray(input?.primaryDressings), secondaryDressings: cleanStringArray(input?.secondaryDressings), periwoundProtection: cleanStringArray(input?.periwoundProtection), advancedTherapies: cleanStringArray(input?.advancedTherapies), offloadingApplied: cleanStringArray(input?.offloadingApplied), education: cleanStringArray(input?.education), tolerance: cleanText(input?.tolerance, 500), notes: cleanText(input?.notes, 1000), verification: stamp(actor, input?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification) });
}

function sanitizeMedical(input, actor, previous = emptyMedical()) {
  return compact({ clinicalImpression: cleanText(input?.clinicalImpression, 1500), infectionAssessment: cleanText(input?.infectionAssessment, 1000), antibiotics: cleanText(input?.antibiotics, 500), requestedTests: cleanStringArray(input?.requestedTests), offloadingPlan: cleanText(input?.offloadingPlan, 1000), treatmentPlan: cleanText(input?.treatmentPlan, 2000), followUpDays: safeNumber(input?.followUpDays, 0, 365), warningSigns: cleanText(input?.warningSigns, 1000), verification: stamp(actor, input?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification) });
}

async function docs(collection) {
  const snap = await collection.get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function withPhotoUrls(encounters) {
  const bucket = getStorage().bucket();
  return Promise.all(encounters.map(async (encounter) => ({
    ...encounter,
    photos: await Promise.all((encounter.photos || []).map(async (photo) => {
      try {
        const [url] = await bucket.file(photo.storagePath).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
        return { ...photo, url };
      } catch { return photo; }
    })),
  })));
}

const PRIMARY_CLINICAL_ROLES = ['nurse', 'doctor'];
const REFERRAL_ROLES = ['general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist', 'physiatrist'];
function hasAnyRole(member, roles) { return member.roles.some((role) => roles.includes(role)); }
function minimalPatient(patient, keepSocial = false) {
  return { ...patient, photoStoragePath: undefined, anamnesis: { medicalHistory: [], surgicalHistory: [], allergyStatus: 'unknown', allergies: [], medications: [] }, social: keepSocial ? patient.social : {} };
}
function photoOnlyEncounter(encounter) {
  return { ...encounter, wound: emptyWound(), wifi: emptyWifi(), nursing: emptyNursing(), medical: emptyMedical(), nursingNarrative: undefined, medicalNarrative: undefined };
}
async function hasAssignedEpisode(member, centerId, episodeId) {
  const snapshot = await db.collection(`centers/${centerId}/tasks`).where('episodeId', '==', episodeId).get();
  return snapshot.docs.some((doc) => workflow.taskGrantsAccess(doc.data(), member));
}

const supplied = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
function mergeAnamnesis(previous, input) {
  const next = { ...previous };
  for (const key of ['diabetesTreatment', 'smoking', 'alcoholUse', 'alcoholDetails', 'substanceUse', 'substanceDetails', 'renalDisease', 'vascularHistory', 'neuropathy', 'previousAmputations']) {
    if (supplied(input, key)) next[key] = cleanText(input[key], key === 'diabetesTreatment' || key === 'vascularHistory' ? 500 : 300);
  }
  for (const key of ['medicalHistory', 'surgicalHistory', 'allergies', 'medications']) {
    if (supplied(input, key)) next[key] = cleanStringArray(input[key]);
  }
  if (supplied(input, 'allergyStatus')) {
    if (!['unknown', 'none', 'present'].includes(input.allergyStatus)) throw Object.assign(new Error('Estado de alergias inválido.'), { status: 400 });
    next.allergyStatus = input.allergyStatus;
  }
  if (next.allergyStatus === 'none') next.allergies = [];
  for (const [key, source] of [['medicalHistoryDetails', 'medicalHistory'], ['surgicalHistoryDetails', 'surgicalHistory']]) {
    if (supplied(input, key) || supplied(input, source)) next[key] = cleanDetailMap(supplied(input, key) ? input[key] : previous[key], next[source]);
  }
  return next;
}
function mergeSocial(previous, input) {
  const next = { ...previous };
  for (const key of ['supportNetwork', 'mobility', 'transportBarriers', 'housingBarriers', 'notes']) {
    if (supplied(input, key)) next[key] = cleanText(input[key], key === 'notes' ? 1000 : 500);
  }
  return next;
}
function activeTaskRef(centerId, task) {
  const key = crypto.createHash('sha256').update([task.patientId, task.episodeId, task.encounterId || '', task.recipientRole, task.type].join('|')).digest('hex');
  return db.doc(`centers/${centerId}/activeTaskKeys/${key}`);
}

function parseLogoDataUrl(value) {
  const match = String(value || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw Object.assign(new Error('El logo debe ser una imagen PNG, JPG o WebP.'), { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) throw Object.assign(new Error('El logo supera el máximo de 2 MB.'), { status: 413 });
  return { buffer, contentType: match[1], ext: match[1].split('/')[1] };
}

async function withCenterLogoUrls(centers) {
  return centers.map((center) => center.logoStoragePath ? { ...center, logoUrl: `/api/public/centers/${encodeURIComponent(center.id)}/logo?v=${encodeURIComponent(center.updatedAt || '')}` } : center);
}

async function withPatientPhotoUrls(patients) {
  const bucket = getStorage().bucket();
  return Promise.all(patients.map(async (patient) => {
    if (!patient.photoStoragePath) return patient;
    try {
      const [photoUrl] = await bucket.file(patient.photoStoragePath).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
      return { ...patient, photoUrl };
    } catch { return patient; }
  }));
}

async function withAttachmentUrls(attachments) {
  const bucket = getStorage().bucket();
  return Promise.all(attachments.map(async (attachment) => {
    try {
      const [url] = await bucket.file(attachment.storagePath).getSignedUrl({ action: 'read', expires: Date.now() + 15 * 60 * 1000 });
      return { ...attachment, url };
    } catch { return attachment; }
  }));
}

async function route(req, res, actor) {
  const path = req.path.replace(/^\/api/, '') || '/';
  const method = req.method;
  if (path === '/health' && method === 'GET') return send(res, 200, { status: 'ok', service: 'pie-diabetico-api', version: '4.0.0' });
  const publicLogoMatch = path.match(/^\/public\/centers\/([^/]+)\/logo$/);
  if (publicLogoMatch && method === 'GET') {
    const snap = await db.doc(`centers/${publicLogoMatch[1]}`).get(); const center = snap.data();
    if (!snap.exists || !center?.logoStoragePath || center.status === 'archived') return send(res, 404, { error: 'Logo no disponible.' });
    const file = getStorage().bucket().file(center.logoStoragePath); const [metadata] = await file.getMetadata(); const [buffer] = await file.download();
    return res.status(200).set('Content-Type', metadata.contentType || 'image/png').set('Cache-Control', 'public, max-age=3600').set('X-Content-Type-Options', 'nosniff').send(buffer);
  }
  if (!actor) throw Object.assign(new Error('Debes iniciar sesión.'), { status: 401 });

  if (path === '/session' && method === 'GET') {
    const platformAdmin = await isPlatformAdmin(actor);
    const memberships = await docs(db.collection('memberships').where('emailLower', '==', actor.email));
    const active = []; const centers = [];
    for (const member of memberships.filter((item) => item.status !== 'disabled')) {
      const snap = await db.doc(`centers/${member.centerId}`).get();
      if (snap.exists && snap.data().status === 'active') { active.push(await membershipFor(member.centerId, actor)); centers.push({ id: snap.id, ...snap.data() }); }
    }
    const visibleCenters = await withCenterLogoUrls(centers);
    logger.info('security_event', securityEvent(req, 'session.validated', 200, 'session_validated'));
    return send(res, 200, { user: actor, platformAdmin, memberships: active, centers: visibleCenters });
  }

  if (path === '/platform/centers') {
    if (!(await isPlatformAdmin(actor))) throw Object.assign(new Error('Acceso exclusivo de administración de plataforma.'), { status: 403 });
    if (method === 'GET') return send(res, 200, { centers: await withCenterLogoUrls(await docs(db.collection('centers'))) });
    if (method === 'POST') {
      const name = cleanText(req.body?.name, 120);
      const adminEmail = cleanEmail(req.body?.adminEmail);
      if (!name) throw Object.assign(new Error('El nombre del centro es obligatorio.'), { status: 400 });
      const ref = db.collection('centers').doc();
      const now = new Date().toISOString();
      let logoFile; let logoStoragePath;
      if (req.body?.logoDataUrl) {
        const logo = parseLogoDataUrl(req.body.logoDataUrl); logoStoragePath = `centers/${ref.id}/branding/logo.${logo.ext}`; logoFile = getStorage().bucket().file(logoStoragePath);
        await logoFile.save(logo.buffer, { resumable: false, contentType: logo.contentType, metadata: { cacheControl: 'private, max-age=0, no-store' } });
      }
      const center = compact({ id: ref.id, name, code: cleanText(req.body?.code, 30).toUpperCase() || ref.id.slice(0, 8).toUpperCase(), region: cleanText(req.body?.region, 80), address: cleanText(req.body?.address, 200), logoStoragePath, whatsappNumber: cleanText(req.body?.whatsappNumber, 30), allowedDomains: cleanStringArray(req.body?.allowedDomains, 20, 100), status: 'active', createdAt: now, updatedAt: now });
      const memberId = `${ref.id}_${hashEmail(adminEmail)}`;
      const member = { id: memberId, centerId: ref.id, email: adminEmail, emailLower: adminEmail, displayName: cleanText(req.body?.adminName || adminEmail, 120), roles: ['center_admin'], status: 'invited', createdAt: now, updatedAt: now };
      const batch = db.batch(); batch.set(ref, center); batch.set(db.doc(`memberships/${memberId}`), member); auditIn(batch, ref.id, actor, 'center.created', 'center', ref.id, { adminEmail });
      try { await batch.commit(); } catch (error) { if (logoFile) await logoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
      return send(res, 201, { center: (await withCenterLogoUrls([center]))[0] });
    }
  }

  const platformCenter = path.match(/^\/platform\/centers\/([^/]+)$/);
  if (platformCenter && method === 'PUT') {
    if (!(await isPlatformAdmin(actor))) throw Object.assign(new Error('Acceso exclusivo de administración de plataforma.'), { status: 403 });
    if (req.body?.name !== undefined && !cleanText(req.body.name, 120)) throw Object.assign(new Error('El nombre del centro es obligatorio.'), { status: 400 });
    const centerId = platformCenter[1]; const ref = db.doc(`centers/${centerId}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Centro no encontrado.'), { status: 404 });
    const previous = snap.data(); const oldLogoPath = previous.logoStoragePath; let nextLogoPath = oldLogoPath; let uploadedLogoFile;
    if (req.body?.logoDataUrl) {
      const logo = parseLogoDataUrl(req.body.logoDataUrl); nextLogoPath = `centers/${centerId}/branding/logo-${crypto.randomUUID()}.${logo.ext}`; uploadedLogoFile = getStorage().bucket().file(nextLogoPath);
      await uploadedLogoFile.save(logo.buffer, { resumable: false, contentType: logo.contentType, metadata: { cacheControl: 'private, max-age=0, no-store' } });
    } else if (req.body?.removeLogo === true) nextLogoPath = undefined;
    const responseUpdate = compact({ name: cleanText(req.body?.name, 120) || undefined, code: cleanText(req.body?.code, 30).toUpperCase() || undefined, region: req.body?.region !== undefined ? cleanText(req.body.region, 80) : undefined, address: req.body?.address !== undefined ? cleanText(req.body.address, 200) : undefined, whatsappNumber: req.body?.whatsappNumber !== undefined ? cleanText(req.body.whatsappNumber, 30) : undefined, allowedDomains: req.body?.allowedDomains ? cleanStringArray(req.body.allowedDomains, 20, 100) : undefined, status: ['active', 'suspended'].includes(req.body?.status) ? req.body.status : undefined, ...(nextLogoPath ? { logoStoragePath: nextLogoPath } : {}), updatedAt: new Date().toISOString() });
    const firestoreUpdate = { ...responseUpdate }; if (!nextLogoPath && oldLogoPath) firestoreUpdate.logoStoragePath = FieldValue.delete();
    const restoringArchived = previous.status === 'archived' && responseUpdate.status === 'active';
    if (restoringArchived) { firestoreUpdate.archivedAt = FieldValue.delete(); firestoreUpdate.archivedByUid = FieldValue.delete(); }
    const batch = db.batch(); batch.update(ref, firestoreUpdate); auditIn(batch, centerId, actor, 'center.updated', 'center', centerId, compact({ status: responseUpdate.status }));
    try { await batch.commit(); } catch (error) { if (uploadedLogoFile) await uploadedLogoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
    if (oldLogoPath && oldLogoPath !== nextLogoPath) await getStorage().bucket().file(oldLogoPath).delete({ ignoreNotFound: true }).catch(() => undefined);
    const center = { id: centerId, ...previous, ...responseUpdate }; if (!nextLogoPath) delete center.logoStoragePath; if (restoringArchived) { delete center.archivedAt; delete center.archivedByUid; }
    return send(res, 200, { center: (await withCenterLogoUrls([center]))[0] });
  }

  if (platformCenter && method === 'DELETE') {
    if (!(await isPlatformAdmin(actor))) throw Object.assign(new Error('Acceso exclusivo de administración de plataforma.'), { status: 403 });
    const centerId = platformCenter[1]; const ref = db.doc(`centers/${centerId}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Centro no encontrado.'), { status: 404 });
    const update = { status: 'archived', archivedAt: new Date().toISOString(), archivedByUid: actor.uid, updatedAt: new Date().toISOString() };
    const batch = db.batch(); batch.update(ref, update); auditIn(batch, centerId, actor, 'center.archived', 'center', centerId); await batch.commit();
    return send(res, 200, { center: { id: centerId, ...snap.data(), ...update } });
  }

  const centerMatch = path.match(/^\/centers\/([^/]+)(\/.*)?$/);
  if (!centerMatch) throw Object.assign(new Error('Ruta no encontrada.'), { status: 404 });
  const centerId = centerMatch[1]; const subpath = centerMatch[2] || '';
  const member = await membershipFor(centerId, actor);
  req.authorizedCenterId = centerId;

  const privatePhotoMatch = subpath.match(/^\/encounters\/([^/]+)\/photos\/([^/]+)\/image$/);
  if (privatePhotoMatch && method === 'GET') {
    requireRole(member, CLINICAL_ROLES);
    const encounterId = privatePhotoMatch[1];
    const encounterSnap = await db.doc(`centers/${centerId}/encounters/${encounterId}`).get();
    if (!encounterSnap.exists) throw Object.assign(new Error('Fotografía no encontrada.'), { status: 404 });
    const encounter = { id: encounterSnap.id, ...encounterSnap.data() };
    const photo = (encounter.photos || []).find((item) => item.id === privatePhotoMatch[2]);
    if (!photo) throw Object.assign(new Error('Fotografía no encontrada.'), { status: 404 });
    const [patientSnap, episodeSnap, tasksSnap] = await Promise.all([
      db.doc(`centers/${centerId}/patients/${encounter.patientId}`).get(),
      db.doc(`centers/${centerId}/episodes/${encounter.episodeId}`).get(),
      db.collection(`centers/${centerId}/tasks`).where('episodeId', '==', encounter.episodeId).get(),
    ]);
    const visible = workflow.projectState(member, {
      patients: patientSnap.exists ? [{ id: patientSnap.id, ...patientSnap.data() }] : [],
      episodes: episodeSnap.exists ? [{ id: episodeSnap.id, ...episodeSnap.data() }] : [],
      encounters: [encounter], tasks: tasksSnap.docs.map((item) => ({ id: item.id, ...item.data() })), attachments: [],
    });
    if (!visible.encounters.some((item) => item.id === encounterId)) throw Object.assign(new Error('Fotografía no disponible para tu perfil.'), { status: 403 });
    const expectedPrefix = `centers/${centerId}/patients/${encounter.patientId}/encounters/${encounterId}/`;
    if (typeof photo.storagePath !== 'string' || !photo.storagePath.startsWith(expectedPrefix) || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.mimeType)) throw Object.assign(new Error('Fotografía no disponible.'), { status: 404 });
    const [buffer] = await getStorage().bucket().file(photo.storagePath).download();
    await audit(centerId, actor, 'photo.viewed', 'photo', photo.id, { encounterId });
    return res.status(200).set('Content-Type', photo.mimeType).set('Cache-Control', 'private, no-store').set('X-Content-Type-Options', 'nosniff').send(buffer);
  }

  if (subpath === '/nursing-catalog' && method === 'GET') {
    requireRole(member, ['center_admin', 'nurse', 'doctor']);
    const snap = await db.doc(`centers/${centerId}/config/nursingCatalog`).get();
    return send(res, 200, { catalog: nursingCatalog.catalogFromData(snap.data()) });
  }

  if (subpath === '/nursing-catalog' && method === 'PUT') {
    requireRole(member, ['center_admin']);
    const options = nursingCatalog.validateOptions(req.body?.options);
    const ref = db.doc(`centers/${centerId}/config/nursingCatalog`);
    const actorRef = db.doc(`memberships/${member.id}`);
    const centerRef = db.doc(`centers/${centerId}`);
    const catalog = await db.runTransaction(async (transaction) => {
      const [snap, actorSnap, centerSnap] = await Promise.all([transaction.get(ref), transaction.get(actorRef), transaction.get(centerRef)]);
      if (centerSnap.data()?.status !== 'active' || actorSnap.data()?.uid !== actor.uid || actorSnap.data()?.status !== 'active' || !actorSnap.data()?.roles?.includes('center_admin')) throw Object.assign(new Error('Tu acceso administrativo cambió.'), { status: 403 });
      const previous = nursingCatalog.catalogFromData(snap.data());
      if (!Number.isInteger(req.body?.revision) || req.body.revision !== previous.revision) throw Object.assign(new Error('El catálogo cambió. Actualiza antes de guardar.'), { status: 409 });
      const next = { revision: previous.revision + 1, options, updatedByUid: actor.uid, updatedByName: actor.name, updatedAt: new Date().toISOString() };
      transaction.set(ref, next);
      auditIn(transaction, centerId, actor, 'nursing_catalog.updated', 'nursingCatalog', 'nursingCatalog', { revision: next.revision });
      return next;
    });
    return send(res, 200, { catalog });
  }

  if (subpath === '/settings' && method === 'PUT') {
    requireRole(member, ['center_admin']); const ref = db.doc(`centers/${centerId}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Centro no encontrado.'), { status: 404 });
    if (!cleanText(req.body?.name, 120)) throw Object.assign(new Error('El nombre del centro es obligatorio.'), { status: 400 });
    const update = compact({ name: cleanText(req.body.name, 120), region: req.body.region === undefined ? undefined : cleanText(req.body.region, 80), address: req.body.address === undefined ? undefined : cleanText(req.body.address, 200), whatsappNumber: req.body.whatsappNumber === undefined ? undefined : cleanText(req.body.whatsappNumber, 30), updatedAt: new Date().toISOString() });
    const batch = db.batch(); batch.update(ref, update); auditIn(batch, centerId, actor, 'center.settings_updated', 'center', centerId); await batch.commit(); return send(res, 200, { center: { id: centerId, ...snap.data(), ...update } });

  }

  if (subpath === '/members') {
    requireRole(member, ['center_admin']);
    if (method === 'GET') return send(res, 200, { members: await docs(db.collection('memberships').where('centerId', '==', centerId)) });
    if (method === 'POST') {
      const reason = accessReason(req.body?.reason); const operation = operationId(req.body?.operationId);
      req.memberOperationId = operation;
      const email = cleanEmail(req.body?.email); const roles = sanitizeRoles(req.body?.roles);
      if (!roles.length) throw Object.assign(new Error('Selecciona al menos un perfil.'), { status: 400 });
      if (!Array.isArray(req.body.roles) || req.body.roles.some((role) => !sanitizeRoles([role]).length)) throw Object.assign(new Error('Selecciona perfiles válidos.'), { status: 400 });
      const id = `${centerId}_${hashEmail(email)}`; const ref = db.doc(`memberships/${id}`); const now = new Date().toISOString();
      const invited = { id, centerId, email, emailLower: email, displayName: cleanText(req.body?.displayName || email, 120), roles, status: 'invited', createdAt: now, updatedAt: now };
      const hash = requestHash({ email, displayName: invited.displayName, roles, reason });
      const result = await db.runTransaction(async (transaction) => {
        const [auditSnap, previous, actorSnap, centerSnap] = await Promise.all([
          transaction.get(db.doc(`centers/${centerId}/auditLogs/${operation}`)), transaction.get(ref),
          transaction.get(db.doc(`memberships/${member.id}`)), transaction.get(db.doc(`centers/${centerId}`)),
        ]);
        if (centerSnap.data()?.status !== 'active' || actorSnap.data()?.uid !== actor.uid || actorSnap.data()?.status !== 'active' || !actorSnap.data()?.roles?.includes('center_admin')) throw Object.assign(new Error('Tu acceso administrativo cambió. Actualiza la sesión.'), { status: 403 });
        if (auditSnap.exists) {
          if (isReplay(auditSnap.data(), actor, 'member.invited', id, hash) && previous.exists && JSON.stringify(accessState(previous.data())) === JSON.stringify(accessState(invited))) return { member: { id, ...previous.data() }, replayed: true };
          throw Object.assign(new Error('Esta operación ya se registró o el acceso cambió. Actualiza el equipo antes de continuar.'), { status: 409 });
        }
        if (previous.exists) throw Object.assign(new Error('Este correo ya pertenece al equipo. Edita sus perfiles o reactiva su acceso.'), { status: 409 });
        transaction.create(ref, invited);
        memberAuditIn(transaction, centerId, actor, 'member.invited', id, operation, req.apiRequestId, hash, reason, null, accessState(invited), 201);
        return { member: invited, replayed: false };
      });

      return send(res, 201, result);
    }
  }

  const memberMatch = subpath.match(/^\/members\/([^/]+)$/);
  if (memberMatch && method === 'PUT') {
    requireRole(member, ['center_admin']); const id = memberMatch[1]; const ref = db.doc(`memberships/${id}`);
    const reason = accessReason(req.body?.reason); const operation = operationId(req.body?.operationId);
    req.memberOperationId = operation;
    if (req.body?.status !== undefined && !['active', 'disabled'].includes(req.body.status)) throw Object.assign(new Error('Estado de acceso inválido.'), { status: 400 });
    if (req.body?.roles !== undefined && (!Array.isArray(req.body.roles) || !req.body.roles.length || req.body.roles.some((role) => !sanitizeRoles([role]).length))) throw Object.assign(new Error('Selecciona perfiles válidos.'), { status: 400 });
    const update = compact({ roles: req.body?.roles ? sanitizeRoles(req.body.roles) : undefined, status: ['invited', 'active', 'disabled'].includes(req.body?.status) ? req.body.status : undefined, updatedAt: new Date().toISOString() });
    if (update.roles && !update.roles.length) throw Object.assign(new Error('Debe conservar al menos un perfil.'), { status: 400 });
    if (!update.roles && !update.status) throw Object.assign(new Error('Indica el cambio de acceso que deseas realizar.'), { status: 400 });
    const hash = requestHash({ roles: update.roles || null, status: update.status || null, reason });
    const result = await db.runTransaction(async (transaction) => {
      const [auditSnap, snap, centerSnap] = await Promise.all([
        transaction.get(db.doc(`centers/${centerId}/auditLogs/${operation}`)), transaction.get(ref), transaction.get(db.doc(`centers/${centerId}`)),
      ]);
      if (!snap.exists || snap.data().centerId !== centerId) throw Object.assign(new Error('Miembro no encontrado.'), { status: 404 });
      const previous = snap.data();
      const team = await transaction.get(db.collection('memberships').where('centerId', '==', centerId));
      const currentActor = team.docs.find((doc) => doc.id === member.id)?.data();
      if (centerSnap.data()?.status !== 'active' || currentActor?.uid !== actor.uid || currentActor?.status !== 'active' || !currentActor.roles.includes('center_admin')) throw Object.assign(new Error('Tu acceso administrativo cambió. Actualiza la sesión.'), { status: 403 });
      if (auditSnap.exists) {
        if (isReplay(auditSnap.data(), actor, 'member.updated', id, hash) && JSON.stringify(accessState(previous)) === JSON.stringify(auditSnap.data().after)) return { member: { id, ...previous }, replayed: true };
        throw Object.assign(new Error('Esta operación ya se registró o el acceso cambió. Actualiza el equipo antes de continuar.'), { status: 409 });
      }
      const next = { ...previous, ...update };
      if (previous.status === 'active' && previous.roles.includes('center_admin') && (next.status !== 'active' || !next.roles.includes('center_admin')) && !team.docs.some((doc) => doc.id !== id && doc.data().status === 'active' && doc.data().roles.includes('center_admin'))) throw Object.assign(new Error('Debe conservarse un administrador activo.'), { status: 409 });
      if (id === member.id && (update.status === 'disabled' || (update.roles && !update.roles.includes('center_admin')))) throw Object.assign(new Error('Otro administrador debe cambiar tu acceso administrativo.'), { status: 409 });
      if (update.status === 'active' && !previous.uid) update.status = 'invited';
      if (JSON.stringify(accessState(previous)) === JSON.stringify(accessState({ ...previous, ...update }))) throw Object.assign(new Error('El acceso ya tiene esos perfiles y estado.'), { status: 409 });
      transaction.update(ref, update);
      memberAuditIn(transaction, centerId, actor, 'member.updated', id, operation, req.apiRequestId, hash, reason, accessState(previous), accessState({ ...previous, ...update }), 200);
      return { member: { id, ...previous, ...update }, replayed: false };
    });

    return send(res, 200, result);
  }

  if (subpath === '/state' && method === 'GET') {
    requireRole(member, CLINICAL_ROLES);
    const [patients, episodes, encounterDocs, tasks, attachmentDocs] = await Promise.all([docs(db.collection(`centers/${centerId}/patients`)), docs(db.collection(`centers/${centerId}/episodes`)), docs(db.collection(`centers/${centerId}/encounters`)), docs(db.collection(`centers/${centerId}/tasks`)), docs(db.collection(`centers/${centerId}/attachments`))]);
    const visible = workflow.projectState(member, { patients, episodes, encounters: encounterDocs, tasks, attachments: attachmentDocs });
    const response = { ...visible, patients: await withPatientPhotoUrls(visible.patients), encounters: await withPhotoUrls(visible.encounters), attachments: await withAttachmentUrls(visible.attachments) };
    await audit(centerId, actor, 'clinical_state.access_granted', 'clinical_state', centerId, {
      patientIds: visible.patients.map((patient) => patient.id),
      episodeIds: visible.episodes.map((episode) => episode.id),
      requestId: req.apiRequestId,
    });
    return send(res, 200, response);
  }

  if (subpath === '/tens-members' && method === 'GET') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']);
    const team = await db.collection('memberships').where('centerId', '==', centerId).get();
    return send(res, 200, { members: team.docs.map((doc) => doc.data()).filter((item) => item.status === 'active' && item.uid && item.roles?.includes('tens')).map((item) => ({ uid: item.uid, displayName: item.displayName || 'TENS' })) });
  }

  if (subpath === '/social-members' && method === 'GET') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']);
    const team = await db.collection('memberships').where('centerId', '==', centerId).get();
    return send(res, 200, { members: team.docs.map((doc) => doc.data()).filter((item) => item.status === 'active' && item.uid && item.roles?.includes('social_worker')).map((item) => ({ uid: item.uid, displayName: item.displayName || 'Trabajo social' })) });

  }

  if (subpath === '/patients' && method === 'POST') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']);
    const rut = normalizeRut(req.body?.rut); const name = cleanText(req.body?.name, 150);
    if (!isValidRut(rut) || !name) throw Object.assign(new Error('Nombre y RUT válido son obligatorios.'), { status: 400 });
    const ref = db.collection(`centers/${centerId}/patients`).doc(); const now = new Date().toISOString();
    const patient = { id: ref.id, centerId, rut, name, birthDate: cleanText(req.body?.birthDate, 10), contact: cleanText(req.body?.contact, 40), comuna: cleanText(req.body?.comuna, 80), intakeAssignedToUid: member.roles.includes('tens') ? actor.uid : undefined, preAdmissionStatus: 'minimal', anamnesis: { medicalHistory: [], medicalHistoryDetails: {}, surgicalHistory: [], surgicalHistoryDetails: {}, allergyStatus: 'unknown', allergies: [], medications: [] }, social: {}, verification: stamp(actor), version: 1, createdAt: now, updatedAt: now };
    const rutRef = db.doc(`centers/${centerId}/patientRuts/${rut}`);
    await db.runTransaction(async (transaction) => {
      const index = await transaction.get(rutRef);
      const existing = await transaction.get(db.collection(`centers/${centerId}/patients`).where('rut', '==', rut).limit(1));
      if (index.exists || !existing.empty) throw Object.assign(new Error('El paciente ya existe en este centro.'), { status: 409 });
      transaction.create(rutRef, { patientId: ref.id, createdAt: now });
      transaction.create(ref, compact(patient));
      auditIn(transaction, centerId, actor, 'patient.created', 'patient', ref.id);
    });
    return send(res, 201, { patient: compact(patient) });
  }

  const patientPhotoMatch = subpath.match(/^\/patients\/([^/]+)\/photo$/);
  if (patientPhotoMatch && method === 'POST') {
    requireRole(member, ['tens', 'nurse', 'doctor']);
    const id = patientPhotoMatch[1]; const ref = db.doc(`centers/${centerId}/patients/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
    if (member.roles.includes('tens') && !hasAnyRole(member, PRIMARY_CLINICAL_ROLES) && snap.data().intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });
    const match = String(req.body?.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Formato de imagen no permitido.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('La imagen supera el máximo de 5 MB.'), { status: 413 });
    const photoId = crypto.randomUUID(); const ext = match[1].split('/')[1]; const photoStoragePath = `centers/${centerId}/patients/${id}/profile/${photoId}.${ext}`;
    const photoFile = getStorage().bucket().file(photoStoragePath);
    await photoFile.save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const updatedAt = new Date().toISOString(); const batch = db.batch(); batch.update(ref, { photoStoragePath, updatedAt }); auditIn(batch, centerId, actor, 'patient.photo.updated', 'patient', id);
    try { await batch.commit(); } catch (error) { await photoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
    const patient = { id, ...snap.data(), photoStoragePath, updatedAt };
    return send(res, 201, { patient: (await withPatientPhotoUrls([hasAnyRole(member, PRIMARY_CLINICAL_ROLES) ? patient : workflow.intakePatient(patient)]))[0] });

  }

  const patientMatch = subpath.match(/^\/patients\/([^/]+)$/);
  if (patientMatch && method === 'PUT') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor', 'social_worker']);
    const id = patientMatch[1]; const ref = db.doc(`centers/${centerId}/patients/${id}`);
    const canValidate = hasAnyRole(member, PRIMARY_CLINICAL_ROLES);
    const canEditClinical = canValidate || member.roles.includes('tens');
    const canEditIdentity = hasAnyRole(member, ['coordinator', 'tens', 'nurse', 'doctor']);
    const canEditSocial = hasAnyRole(member, ['tens', 'nurse', 'doctor', 'social_worker']);
    const identityFields = ['name', 'birthDate', 'contact', 'comuna'];
    if (supplied(req.body, 'anamnesis') && !canEditClinical || (supplied(req.body, 'verification') || supplied(req.body, 'preAdmissionStatus')) && !canEditClinical) throw Object.assign(new Error('Los antecedentes clínicos requieren medicina o enfermería.'), { status: 403 });
    if ((supplied(req.body, 'social') || supplied(req.body, 'socialVerification')) && !canEditSocial) throw Object.assign(new Error('Tu perfil no puede editar la evaluación social.'), { status: 403 });
    if (identityFields.some((field) => supplied(req.body, field)) && !canEditIdentity) throw Object.assign(new Error('Tu perfil no puede editar identidad y contacto.'), { status: 403 });
    if (supplied(req.body, 'intakeAssignedToUid') && !hasAnyRole(member, ['coordinator', 'nurse', 'doctor'])) throw Object.assign(new Error('Tu perfil no puede asignar el preingreso.'), { status: 403 });
    if (!Number.isInteger(req.body?.version) || req.body.version < 1) throw Object.assign(new Error('Se requiere la versión actual del paciente.'), { status: 400 });
    if (!canValidate && member.roles.includes('tens') && (req.body?.verification?.status === 'confirmed' || req.body?.socialVerification?.status === 'confirmed' || req.body?.preAdmissionStatus === 'validated')) throw Object.assign(new Error('TENS puede preparar antecedentes, pero no validarlos.'), { status: 403 });
    let saved;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
      const previous = snap.data();
      if (req.body.version !== (previous.version || 1)) throw Object.assign(new Error('El paciente cambió en otra sesión. Recarga y revisa antes de guardar.'), { status: 409 });
      if (!canValidate && member.roles.includes('tens') && previous.intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });
      const assignedUid = supplied(req.body, 'intakeAssignedToUid') ? cleanText(req.body.intakeAssignedToUid, 128) : undefined;
      if (assignedUid) {
        const assignedMemberships = await transaction.get(db.collection('memberships').where('uid', '==', assignedUid));
        if (!assignedMemberships.docs.some((doc) => doc.data().centerId === centerId && doc.data().status === 'active' && doc.data().roles?.includes('tens'))) throw Object.assign(new Error('La persona TENS debe estar activa en este centro.'), { status: 400 });
      }
      if (!canValidate && member.roles.includes('tens') && previous.preAdmissionStatus === 'validated' && (supplied(req.body, 'anamnesis') || supplied(req.body, 'social'))) throw Object.assign(new Error('El preingreso validado requiere corrección por enfermería o medicina.'), { status: 403 });
      if (member.roles.includes('social_worker') && !canValidate && (!canEditClinical || req.body?.socialVerification?.status === 'confirmed')) {
        const tasks = await transaction.get(db.collection(`centers/${centerId}/tasks`).where('patientId', '==', id));
        if (!tasks.docs.some((doc) => doc.data().recipientRole === 'social_worker' && workflow.taskGrantsAccess(doc.data(), member))) throw Object.assign(new Error('No tienes una gestión social activa de este paciente.'), { status: 403 });
      }
      const clinicalInput = req.body?.anamnesis;
      const socialInput = req.body?.social;
      if (clinicalInput != null && (typeof clinicalInput !== 'object' || Array.isArray(clinicalInput)) || socialInput != null && (typeof socialInput !== 'object' || Array.isArray(socialInput))) throw Object.assign(new Error('Sección de paciente inválida.'), { status: 400 });
      const update = { updatedAt: new Date().toISOString(), version: (previous.version || 1) + 1 };
      if (supplied(req.body, 'intakeAssignedToUid')) update.intakeAssignedToUid = assignedUid || null;
      if (canEditIdentity) for (const field of identityFields) if (supplied(req.body, field)) update[field] = cleanText(req.body[field], field === 'name' ? 150 : field === 'birthDate' ? 10 : field === 'contact' ? 40 : 80);
      if (supplied(update, 'name') && !update.name) throw Object.assign(new Error('El nombre no puede quedar vacío.'), { status: 400 });
      if (clinicalInput) update.anamnesis = mergeAnamnesis(previous.anamnesis || {}, clinicalInput);
      if (socialInput) update.social = mergeSocial(previous.social || {}, socialInput);
      if (supplied(req.body, 'preAdmissionStatus')) {
        if (!['in_progress', 'pending_validation', 'validated'].includes(req.body.preAdmissionStatus)) throw Object.assign(new Error('Estado de preingreso inválido.'), { status: 400 });
        update.preAdmissionStatus = req.body.preAdmissionStatus;
      }
      if (clinicalInput || supplied(req.body, 'verification') || supplied(req.body, 'preAdmissionStatus')) {
        const confirmed = canValidate && req.body?.verification?.status === 'confirmed' && req.body?.preAdmissionStatus === 'validated';
        update.verification = stamp(actor, confirmed ? 'confirmed' : 'draft', previous.verification);
        if (!confirmed && previous.preAdmissionStatus === 'validated' && !supplied(update, 'preAdmissionStatus')) update.preAdmissionStatus = 'in_progress';
        if (update.preAdmissionStatus === 'validated' && !confirmed) throw Object.assign(new Error('La validación clínica requiere revisión explícita.'), { status: 400 });
      }
      if (socialInput || supplied(req.body, 'socialVerification')) update.socialVerification = stamp(actor, canValidate || member.roles.includes('social_worker') ? req.body?.socialVerification?.status === 'confirmed' ? 'confirmed' : 'draft' : 'draft', previous.socialVerification);
      transaction.update(ref, update);
      auditIn(transaction, centerId, actor, 'patient.updated', 'patient', id, { sections: Object.keys(req.body).filter((key) => key !== 'version') });
      saved = { id, ...previous, ...update };
    });
    return send(res, 200, { patient: canValidate ? saved : member.roles.includes('tens') ? workflow.intakePatient(saved) : workflow.minimalPatient(saved, member.roles.includes('social_worker')) });

  }

  if (subpath === '/episodes' && method === 'POST') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']); const patientId = cleanText(req.body?.patientId, 60);
    const patient = await db.doc(`centers/${centerId}/patients/${patientId}`).get();
    if (!patient.exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
    if (member.roles.includes('tens') && !hasAnyRole(member, PRIMARY_CLINICAL_ROLES) && !member.roles.includes('coordinator') && patient.data().intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });
    if (!['right', 'left'].includes(req.body?.side) || !cleanText(req.body?.location, 120)) throw Object.assign(new Error('Lado y ubicación de la herida son obligatorios.'), { status: 400 });
    const ref = db.collection(`centers/${centerId}/episodes`).doc(); const now = new Date().toISOString();
    const consentForPhotography = req.body?.consentForPhotography === true;
    const episode = { id: ref.id, centerId, patientId, side: req.body.side, location: cleanText(req.body.location, 120), onsetDate: cleanText(req.body?.onsetDate, 10), etiology: cleanText(req.body?.etiology, 300), referralSource: cleanText(req.body?.referralSource, 200), status: 'active', priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : 'routine', consentForPhotography, ...(consentForPhotography ? { photoConsentLastDecision: 'granted', photoConsentUpdatedAt: now, photoConsentUpdatedByName: actor.name } : {}), createdAt: now, updatedAt: now };
    const batch = db.batch(); batch.create(ref, compact(episode)); auditIn(batch, centerId, actor, 'episode.created', 'episode', ref.id, { consentForPhotography }); await batch.commit();
    return send(res, 201, { episode: compact(episode) });
  }

  const episodeMatch = subpath.match(/^\/episodes\/([^/]+)$/);
  if (episodeMatch && method === 'PUT') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']); const id = episodeMatch[1]; const ref = db.doc(`centers/${centerId}/episodes/${id}`);
    if (supplied(req.body, 'consentForPhotography') && typeof req.body.consentForPhotography !== 'boolean') throw Object.assign(new Error('La decisión de consentimiento debe ser explícita.'), { status: 400 });
    const tensOnly = member.roles.includes('tens') && !hasAnyRole(member, ['coordinator', 'nurse', 'doctor']);
    if (tensOnly && (typeof req.body?.consentForPhotography !== 'boolean' || Object.keys(req.body).some((key) => key !== 'consentForPhotography'))) throw Object.assign(new Error('Tu perfil sólo puede registrar el consentimiento fotográfico.'), { status: 403 });
    let saved;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Episodio no encontrado.'), { status: 404 });
      const previous = snap.data();
      if (tensOnly) {
        const patient = await transaction.get(db.doc(`centers/${centerId}/patients/${previous.patientId}`));
        if (patient.data()?.intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });
      }
      const changed = typeof req.body?.consentForPhotography === 'boolean' && previous.consentForPhotography !== req.body.consentForPhotography;
      const now = new Date().toISOString();
      const update = compact({ status: ['active', 'healed', 'referred', 'closed'].includes(req.body?.status) ? req.body.status : undefined, priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : undefined, consentForPhotography: changed ? req.body.consentForPhotography : undefined, photoConsentLastDecision: changed ? (req.body.consentForPhotography ? 'granted' : 'withdrawn') : undefined, photoConsentUpdatedAt: changed ? now : undefined, photoConsentUpdatedByName: changed ? actor.name : undefined, updatedAt: now });
      transaction.update(ref, update);
      if (changed) auditIn(transaction, centerId, actor, 'episode.photo_consent_updated', 'episode', id, { from: previous.consentForPhotography === true, to: req.body.consentForPhotography });
      if (Object.keys(update).some((key) => !['updatedAt', 'consentForPhotography', 'photoConsentLastDecision', 'photoConsentUpdatedAt', 'photoConsentUpdatedByName'].includes(key))) auditIn(transaction, centerId, actor, 'episode.updated', 'episode', id);
      saved = { id, ...previous, ...update };
    });
    return send(res, 200, { episode: saved });
  }

  if (subpath === '/encounters' && method === 'POST') {
    requireRole(member, ['tens', 'nurse', 'doctor']); const patientId = cleanText(req.body?.patientId, 60); const episodeId = cleanText(req.body?.episodeId, 60);
    const [patient, episode] = await Promise.all([db.doc(`centers/${centerId}/patients/${patientId}`).get(), db.doc(`centers/${centerId}/episodes/${episodeId}`).get()]);
    if (!patient.exists || !episode.exists || episode.data().patientId !== patientId) throw Object.assign(new Error('Paciente o episodio no válido.'), { status: 400 });
    if (member.roles.includes('tens') && !hasAnyRole(member, PRIMARY_CLINICAL_ROLES) && patient.data().intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });
    const linkedEncounterId = cleanText(req.body?.linkedEncounterId, 60);
    let linkedEncounter;
    if (linkedEncounterId) {
      requireRole(member, ['nurse']);
      const linked = await db.doc(`centers/${centerId}/encounters/${linkedEncounterId}`).get();
      linkedEncounter = linked.data();
      workflow.assertVisitLink(linkedEncounter, patientId, episodeId);
    }
    const ref = db.collection(`centers/${centerId}/encounters`).doc(); const now = new Date().toISOString();
    const encounter = { id: ref.id, centerId, patientId, episodeId, visitId: linkedEncounter ? linkedEncounter.visitId || linkedEncounterId : ref.id, episodeLocation: episode.data().location, episodeSide: episode.data().side, careType: ['nursing', 'medical', 'joint'].includes(req.body?.careType) ? req.body.careType : 'joint', encounterDate: linkedEncounter ? linkedEncounter.encounterDate : cleanText(req.body?.encounterDate, 30) || now, status: 'in_progress', wound: emptyWound(), wifi: emptyWifi(), nursing: emptyNursing(), medical: emptyMedical(), photos: [], version: 1, createdAt: now, updatedAt: now };
    encounter.nursingNarrative = nursingNarrative(encounter); encounter.medicalNarrative = medicalNarrative(encounter);
    const batch = db.batch(); batch.create(ref, encounter); auditIn(batch, centerId, actor, 'encounter.created', 'encounter', ref.id); await batch.commit(); return send(res, 201, { encounter: hasAnyRole(member, PRIMARY_CLINICAL_ROLES) ? encounter : workflow.photoOnlyEncounter(encounter) });

  }

  const encounterMatch = subpath.match(/^\/encounters\/([^/]+)$/);
  if (encounterMatch && method === 'PUT') {
    requireRole(member, ['doctor', 'nurse']);
    const id = encounterMatch[1]; const ref = db.doc(`centers/${centerId}/encounters/${id}`); let saved;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref); if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 }); const previous = snap.data();
      workflow.assertMutable(previous);
      if (Number(req.body?.version) !== previous.version) throw Object.assign(new Error('Otro profesional actualizó esta atención. Recarga antes de guardar.'), { status: 409 });
      const update = { updatedAt: new Date().toISOString(), version: previous.version + 1 };
      if (!previous.episodeLocation || !previous.episodeSide) {
        const episodeSnapshot = await transaction.get(db.doc(`centers/${centerId}/episodes/${previous.episodeId}`));
        if (episodeSnapshot.exists) { update.episodeLocation = episodeSnapshot.data().location; update.episodeSide = episodeSnapshot.data().side; }
      }
      if (req.body?.wound) { requireRole(member, ['doctor', 'nurse']); update.wound = sanitizeWound(req.body.wound, actor, previous.wound); }
      if (req.body?.wifi) { requireRole(member, ['doctor']); update.wifi = sanitizeWifi(req.body.wifi, actor, previous.wifi); }
      if (req.body?.nursing) { requireRole(member, ['nurse']); update.nursing = sanitizeNursing(req.body.nursing, actor, previous.nursing); }
      if (req.body?.medical) { requireRole(member, ['doctor']); update.medical = sanitizeMedical(req.body.medical, actor, previous.medical); }
      if (req.body?.status && ['draft', 'in_progress', 'ready_for_review', 'completed', 'cancelled'].includes(req.body.status)) { requireRole(member, ['doctor', 'nurse']); update.status = req.body.status; }
      if (req.body?.careType) {
        if (!['nursing', 'medical', 'joint'].includes(req.body.careType)) throw Object.assign(new Error('Tipo de atención inválido.'), { status: 400 });
        update.careType = req.body.careType;
      }
      for (const key of ['wound', 'nursing', 'medical', 'wifi']) if (update[key]) workflow.validateSection(key, update[key]);
      if (update.wifi && !update.medical) update.medical = { ...previous.medical, verification: workflow.invalidate(previous.medical.verification) };
      if (update.wound) {
        if (!update.wifi) update.wifi = { ...previous.wifi, verification: workflow.invalidate(previous.wifi.verification) };
        if (!update.nursing) update.nursing = { ...previous.nursing, verification: workflow.invalidate(previous.nursing.verification) };
        if (!update.medical) update.medical = { ...previous.medical, verification: workflow.invalidate(previous.medical.verification) };
      }
      saved = { id, ...previous, ...update };
      if (saved.status === 'completed') workflow.assertComplete(saved);
      transaction.set(ref.collection('revisions').doc(String(previous.version)), previous);
      saved.nursingNarrative = nursingNarrative(saved); saved.medicalNarrative = medicalNarrative(saved);
      transaction.update(ref, compact({ ...update, nursingNarrative: saved.nursingNarrative, medicalNarrative: saved.medicalNarrative }));
      auditIn(transaction, centerId, actor, 'encounter.updated', 'encounter', id, { sections: Object.keys(req.body || {}).filter((key) => key !== 'version') });
    });
    return send(res, 200, { encounter: saved });
  }

  const submitPhotoRegistrationMatch = subpath.match(/^\/encounters\/([^/]+)\/photo-registration\/submit$/);
  if (submitPhotoRegistrationMatch && method === 'POST') {
    requireRole(member, ['tens']);
    if (hasAnyRole(member, PRIMARY_CLINICAL_ROLES)) throw Object.assign(new Error('La entrega de TENS requiere el perfil de registro fotográfico.'), { status: 403 });
    const id = submitPhotoRegistrationMatch[1]; const ref = db.doc(`centers/${centerId}/encounters/${id}`);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Registro fotográfico no encontrado.'), { status: 404 });
      const previous = snap.data(); workflow.assertMutable(previous);
      const patient = await transaction.get(db.doc(`centers/${centerId}/patients/${previous.patientId}`));
      if (!patient.exists || patient.data().intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El paciente no está asignado a tu cuenta.'), { status: 403 });
      if (Number(req.body?.version) !== previous.version) throw Object.assign(new Error('El registro cambió. Actualiza antes de enviarlo.'), { status: 409 });
      const registration = previous.photoRegistration || { status: 'in_progress' };
      if (['submitted', 'reviewed'].includes(registration.status)) throw Object.assign(new Error('El registro ya fue enviado a revisión.'), { status: 409 });
      const ownPhotos = (previous.photos || []).filter((photo) => photo.capturedByUid === actor.uid);
      if (!ownPhotos.length) throw Object.assign(new Error('Guarda al menos una fotografía antes de enviar el registro.'), { status: 400 });
      if (registration.status === 'needs_repeat' && !ownPhotos.some((photo) => photo.kind === registration.repeatKind && photo.capturedAt > registration.repeatRequestedAt)) throw Object.assign(new Error('Guarda una nueva fotografía del momento solicitado antes de reenviar.'), { status: 400 });
      const submittedPhotoIds = ['pre', 'post'].map((kind) => ownPhotos.filter((photo) => photo.kind === kind).at(-1)?.id).filter(Boolean);
      const now = new Date().toISOString();
      transaction.update(ref, { photoRegistration: { ...registration, status: 'submitted', submittedAt: now, submittedByUid: actor.uid, submittedByName: actor.name, submittedPhotoIds, reviewedAt: null, reviewedByUid: null, reviewedByName: null }, updatedAt: now, version: previous.version + 1 });
      auditIn(transaction, centerId, actor, 'photo_registration.submitted', 'encounter', id, { photoCount: submittedPhotoIds.length, submittedPhotoIds });
    });
    const current = await ref.get();
    return send(res, 200, { encounter: (await withPhotoUrls([workflow.photoOnlyEncounter({ id, ...current.data() })]))[0] });
  }

  const photoMatch = subpath.match(/^\/encounters\/([^/]+)\/photos$/);
  if (photoMatch && method === 'POST') {
    requireRole(member, ['tens', 'nurse', 'doctor']); const id = photoMatch[1]; const ref = db.doc(`centers/${centerId}/encounters/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 });
    const tensOnly = member.roles.includes('tens') && !hasAnyRole(member, PRIMARY_CLINICAL_ROLES);
    if (tensOnly && (await db.doc(`centers/${centerId}/patients/${snap.data().patientId}`).get()).data()?.intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 });

    workflow.assertMutable(snap.data());
    if (tensOnly && ['submitted', 'reviewed'].includes(snap.data().photoRegistration?.status)) throw Object.assign(new Error('El registro ya fue enviado. Espera la revisión o una solicitud de repetición.'), { status: 409 });
    if (!['pre', 'post'].includes(req.body?.kind) || req.body?.orientationConfirmed !== true) throw Object.assign(new Error('Confirma el momento y la orientación de la fotografía.'), { status: 400 });
    const episode = await db.doc(`centers/${centerId}/episodes/${snap.data().episodeId}`).get();
    if (!episode.exists || episode.data().consentForPhotography !== true) throw Object.assign(new Error('Debes registrar consentimiento para fotografías antes de capturar.'), { status: 400 });
    if (req.body?.measurement !== undefined && req.body?.scaleIncluded !== true) throw Object.assign(new Error('Confirma la referencia física de escala antes de guardar la medición.'), { status: 400 });
    const measurement = req.body?.measurement === undefined ? undefined : validatePhotoMeasurement(req.body.measurement);
    const match = String(req.body?.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Formato de imagen no permitido.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64'); if (buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('La imagen supera el máximo de 5 MB.'), { status: 413 });
    const kind = req.body?.kind === 'post' ? 'post' : 'pre'; const photoId = crypto.randomUUID(); const ext = match[1].split('/')[1]; const storagePath = `centers/${centerId}/patients/${snap.data().patientId}/encounters/${id}/${photoId}.${ext}`;
    const photoFile = getStorage().bucket().file(storagePath);
    await photoFile.save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const photo = { id: photoId, kind, storagePath, capturedAt: new Date().toISOString(), capturedByUid: actor.uid, capturedByName: actor.name, mimeType: match[1], orientationConfirmed: req.body?.orientationConfirmed === true, scaleIncluded: req.body?.scaleIncluded === true, ...(measurement ? { measurement } : {}), quality: 'pending' };
    try {
      await db.runTransaction(async (transaction) => { const current = await transaction.get(ref); if (!current.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 }); workflow.assertMutable(current.data()); const consent = await transaction.get(episode.ref); if (!consent.data()?.consentForPhotography) throw Object.assign(new Error('Consentimiento fotográfico no disponible.'), { status: 400 }); if (tensOnly) { const currentPatient = await transaction.get(db.doc(`centers/${centerId}/patients/${current.data().patientId}`)); if (currentPatient.data()?.intakeAssignedToUid !== actor.uid) throw Object.assign(new Error('El preingreso no está asignado a tu cuenta.'), { status: 403 }); if (['submitted', 'reviewed'].includes(current.data().photoRegistration?.status)) throw Object.assign(new Error('El registro ya fue enviado. Espera la revisión o una solicitud de repetición.'), { status: 409 }); } transaction.update(ref, { photos: FieldValue.arrayUnion(photo), updatedAt: new Date().toISOString(), version: FieldValue.increment(1) }); auditIn(transaction, centerId, actor, 'photo.uploaded', 'encounter', id, { kind, measured: Boolean(measurement) }); });
    } catch (error) { await photoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }

    const current = await ref.get(); return send(res, 201, { encounter: (await withPhotoUrls([hasAnyRole(member, PRIMARY_CLINICAL_ROLES) ? { id, ...current.data() } : workflow.photoOnlyEncounter({ id, ...current.data() })]))[0] });
  }

  const reviewPhotoMatch = subpath.match(/^\/encounters\/([^/]+)\/photos\/([^/]+)$/);
  if (reviewPhotoMatch && method === 'PUT') {
    requireRole(member, ['nurse', 'doctor']);
    const ref = db.doc(`centers/${centerId}/encounters/${reviewPhotoMatch[1]}`);
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 });
      workflow.assertMutable(snap.data());
      if (Number(req.body.version) !== snap.data().version) throw Object.assign(new Error('La atención cambió. Actualiza antes de revisar.'), { status: 409 });
      if (!['accepted', 'repeat'].includes(req.body.quality) || (req.body.quality === 'repeat' && !cleanText(req.body.reason))) throw Object.assign(new Error('Indica la calidad y el motivo de repetición.'), { status: 400 });
      if (!snap.data().photos.some((p) => p.id === reviewPhotoMatch[2])) throw Object.assign(new Error('Foto no encontrada.'), { status: 404 });
      const now = new Date().toISOString();
      const photos = snap.data().photos.map((photo) => photo.id === reviewPhotoMatch[2] ? { ...photo, quality: req.body.quality, reviewReason: cleanText(req.body.reason, 500), reviewedByName: actor.name, reviewedByUid: actor.uid, reviewedAt: now } : photo);
      const registration = snap.data().photoRegistration;
      let photoRegistration;
      if (registration && ['submitted', 'reviewed'].includes(registration.status) && registration.submittedPhotoIds?.includes(reviewPhotoMatch[2])) {
        if (req.body.quality === 'repeat') photoRegistration = { ...registration, status: 'needs_repeat', repeatRequestedAt: now, repeatKind: snap.data().photos.find((photo) => photo.id === reviewPhotoMatch[2]).kind, repeatReason: cleanText(req.body.reason, 500), reviewedAt: null, reviewedByUid: null, reviewedByName: null };
        else if (registration.status === 'submitted') {
          if (registration.submittedPhotoIds.every((id) => photos.find((photo) => photo.id === id)?.quality === 'accepted')) photoRegistration = { ...registration, status: 'reviewed', reviewedAt: now, reviewedByUid: actor.uid, reviewedByName: actor.name };
        }
      }
      transaction.update(ref, { photos, ...(photoRegistration ? { photoRegistration } : {}), version: snap.data().version + 1, updatedAt: now });
      auditIn(transaction, centerId, actor, 'photo.reviewed', 'encounter', ref.id);
    });

    return send(res, 200, { encounter: (await withPhotoUrls([{ id: ref.id, ...(await ref.get()).data() }]))[0] });
  }
  const narrativeMatch = subpath.match(/^\/encounters\/([^/]+)\/narratives\/(nursing|medical)$/);
  if (narrativeMatch && method === 'PUT') {
    const section = narrativeMatch[2]; requireRole(member, [section === 'nursing' ? 'nurse' : 'doctor']);
    const ref = db.doc(`centers/${centerId}/encounters/${narrativeMatch[1]}`);
    const text = cleanText(req.body.text, 12000); if (!text) throw Object.assign(new Error('El texto no puede quedar vacío.'), { status: 400 });
    let review;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref); if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 });
      const current = snap.data();
      if (current.status === 'cancelled') throw Object.assign(new Error('La atención está cancelada.'), { status: 400 });
      const generated = section === 'nursing' ? nursingNarrative(current) : medicalNarrative(current);
      if (req.body.sourceText !== generated) throw Object.assign(new Error('Los datos de origen cambiaron. Revisa el nuevo texto.'), { status: 409 });
      const required = section === 'nursing' ? ['wound', 'nursing'] : ['wound', 'medical', 'wifi'];
      if (required.some((key) => current[key].verification.status !== 'confirmed')) throw Object.assign(new Error('Confirma las secciones de origen antes de revisar el texto.'), { status: 400 });
      review = { text, sourceText: generated, sourceVersion: current.version, authorName: actor.name, authorUid: actor.uid, reviewedAt: new Date().toISOString() };
      transaction.set(ref.collection('narrativeReviews').doc(), { ...review, section });
      transaction.update(ref, { [`narrativeReviews.${section}`]: review });
      auditIn(transaction, centerId, actor, 'narrative.reviewed', 'encounter', ref.id, { section });
    });

    return send(res, 200, { review });
  }
  const addendumMatch = subpath.match(/^\/encounters\/([^/]+)\/addenda$/);
  if (addendumMatch && method === 'POST') {
    requireRole(member, ['nurse', 'doctor']);
    const ref = db.doc(`centers/${centerId}/encounters/${addendumMatch[1]}`);
    const text = cleanText(req.body.text, 3000);
    if (!text) throw Object.assign(new Error('Escribe el motivo y la corrección.'), { status: 400 });
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 });
      if (!['completed', 'cancelled'].includes(snap.data().status)) throw Object.assign(new Error('La atención sigue abierta.'), { status: 400 });
      transaction.update(ref, { addenda: FieldValue.arrayUnion({ id: crypto.randomUUID(), text, authorUid: actor.uid, authorName: actor.name, createdAt: new Date().toISOString() }), version: snap.data().version + 1 });
      auditIn(transaction, centerId, actor, 'encounter.addendum', 'encounter', ref.id);
    });

    return send(res, 200, { encounter: (await withPhotoUrls([{ id: ref.id, ...(await ref.get()).data() }]))[0] });
  }

  const attachmentMatch = subpath.match(/^\/episodes\/([^/]+)\/attachments$/);
  if (attachmentMatch && method === 'POST') {
    requireRole(member, ['nurse', 'doctor', 'general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist']);
    const episodeId = attachmentMatch[1]; const episode = await db.doc(`centers/${centerId}/episodes/${episodeId}`).get();
    if (!episode.exists) throw Object.assign(new Error('Episodio no encontrado.'), { status: 404 });
    if (!hasAnyRole(member, ['nurse', 'doctor']) && !(await hasAssignedEpisode(member, centerId, episodeId))) throw Object.assign(new Error('Sólo puedes cargar documentos en casos asignados a tu perfil.'), { status: 403 });
    const data = String(req.body?.dataUrl || '');
    const match = data.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Sólo se permiten PDF, JPEG, PNG o WebP.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 10 * 1024 * 1024) throw Object.assign(new Error('El archivo supera el máximo de 10 MB.'), { status: 413 });
    const kind = ['laboratory', 'pvr', 'imaging', 'other'].includes(req.body?.kind) ? req.body.kind : 'other';
    const id = crypto.randomUUID(); const extension = match[1] === 'application/pdf' ? 'pdf' : match[1].split('/')[1]; const storagePath = `centers/${centerId}/patients/${episode.data().patientId}/episodes/${episodeId}/attachments/${id}.${extension}`;
    const attachmentFile = getStorage().bucket().file(storagePath);
    await attachmentFile.save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const attachment = { id, centerId, patientId: episode.data().patientId, episodeId, kind, title: cleanText(req.body?.title, 160) || 'Documento clínico', storagePath, mimeType: match[1], uploadedByUid: actor.uid, uploadedByName: actor.name, createdAt: new Date().toISOString() };
    const batch = db.batch(); batch.create(db.doc(`centers/${centerId}/attachments/${id}`), attachment); auditIn(batch, centerId, actor, 'attachment.uploaded', 'attachment', id, { kind, episodeId });
    try { await batch.commit(); } catch (error) { await attachmentFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
    return send(res, 201, { attachment: (await withAttachmentUrls([attachment]))[0] });
  }

  if (subpath === '/tasks' && method === 'POST') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']);
    const recipientRole = sanitizeRoles([req.body?.recipientRole])[0]; const patientId = cleanText(req.body?.patientId, 60); const episodeId = cleanText(req.body?.episodeId, 60);
    if (!['nurse', 'doctor', ...REFERRAL_ROLES, 'social_worker'].includes(recipientRole)) throw Object.assign(new Error('Perfil destinatario inválido.'), { status: 400 });
    if (!recipientRole || !patientId || !episodeId || !cleanText(req.body?.reason, 1000)) throw Object.assign(new Error('Destinatario, paciente, episodio y motivo son obligatorios.'), { status: 400 });
    const [patientDoc, episodeDoc] = await Promise.all([db.doc(`centers/${centerId}/patients/${patientId}`).get(), db.doc(`centers/${centerId}/episodes/${episodeId}`).get()]);
    if (!patientDoc.exists || !episodeDoc.exists || episodeDoc.data().patientId !== patientId) throw Object.assign(new Error('Paciente y episodio no corresponden.'), { status: 400 });
    let referralSnapshot;
    if (req.body?.encounterId) {
      requireRole(member, ['nurse', 'doctor']);
      const source = await db.doc(`centers/${centerId}/encounters/${cleanText(req.body.encounterId, 60)}`).get();
      if (!source.exists || source.data().episodeId !== episodeId) throw Object.assign(new Error('Atención de origen inválida.'), { status: 400 });
      referralSnapshot = workflow.referralSnapshot({ id: source.id, ...source.data() }, patientDoc.data(), episodeDoc.data());
    }
    const ref = db.collection(`centers/${centerId}/tasks`).doc(); const now = new Date().toISOString();
    const task = { referralSnapshot, id: ref.id, centerId, patientId, episodeId, encounterId: cleanText(req.body?.encounterId, 60), type: ['general_surgery', 'vascular', 'traumatology', 'physiatry', 'social', 'exam', 'other'].includes(req.body?.type) ? req.body.type : 'other', recipientRole, title: cleanText(req.body?.title, 160) || 'Nueva gestión clínica', reason: cleanText(req.body.reason, 1000), priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : 'routine', dueAt: cleanText(req.body?.dueAt, 30), status: 'created', version: 1, createdByUid: actor.uid, createdByName: actor.name, createdAt: now, updatedAt: now };
    const keyRef = activeTaskRef(centerId, task);
    await db.runTransaction(async (transaction) => {
      const [slot, existing] = await Promise.all([
        transaction.get(keyRef),
        transaction.get(db.collection(`centers/${centerId}/tasks`).where('episodeId', '==', episodeId)),
      ]);
      if (slot.exists || existing.docs.some((doc) => {
        const current = doc.data();
        return current.patientId === patientId && current.recipientRole === recipientRole && current.type === task.type && (current.encounterId || '') === (task.encounterId || '') && !['resolved', 'rejected'].includes(current.status);
      })) throw Object.assign(new Error('Ya existe una gestión activa para este caso y destinatario.'), { status: 409 });
      transaction.create(ref, compact(task));
      transaction.create(keyRef, { taskId: ref.id, createdAt: now });
      auditIn(transaction, centerId, actor, 'task.created', 'task', ref.id, { recipientRole, priority: task.priority });
    });
    return send(res, 201, { task: compact(task) });

  }

  const taskMatch = subpath.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch && method === 'PUT') {
    const id = taskMatch[1]; const ref = db.doc(`centers/${centerId}/tasks/${id}`);
    if (!Number.isInteger(req.body?.version) || req.body.version < 1) throw Object.assign(new Error('Se requiere la versión actual de la gestión.'), { status: 400 });
    let saved;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists) throw Object.assign(new Error('Tarea no encontrada.'), { status: 404 });
      const task = snap.data();
      if (req.body.version !== (task.version || 1)) throw Object.assign(new Error('La gestión cambió en otra sesión. Recarga antes de guardar.'), { status: 409 });
      workflow.assertTaskTransition(task.status, req.body?.status);
      const isRecipient = member.roles.includes(task.recipientRole) && (task.recipientRole !== 'social_worker' || Boolean(task.assignedToUid)) && (!task.assignedToUid || task.assignedToUid === actor.uid);
      const isManager = hasAnyRole(member, ['coordinator', 'nurse', 'doctor']) || task.createdByUid === actor.uid;
      const status = req.body?.status || task.status;
      if (!isRecipient && !isManager) throw Object.assign(new Error('No puedes actualizar esta gestión.'), { status: 403 });
      if (['accepted', 'in_progress', 'resolved', 'rejected'].includes(status) && status !== task.status && !isRecipient) throw Object.assign(new Error('El estado corresponde al profesional destinatario.'), { status: 403 });
      if (status === 'notified' && status !== task.status && !isManager) throw Object.assign(new Error('La notificación corresponde a coordinación o al solicitante.'), { status: 403 });
      if (supplied(req.body, 'result') && (!isRecipient || !['accepted', 'in_progress'].includes(task.status))) throw Object.assign(new Error('La respuesta requiere una gestión aceptada por el destinatario.'), { status: 403 });
      if (status === 'resolved' && !cleanText(req.body?.result || task.result, 1500)) throw Object.assign(new Error('Registra una respuesta antes de resolver.'), { status: 400 });
      let assignedToUid = task.assignedToUid;
      if (supplied(req.body, 'assignedToUid')) {
        if (!isManager || ['accepted', 'in_progress'].includes(task.status)) throw Object.assign(new Error('No puedes reasignar esta gestión en su estado actual.'), { status: 403 });
        assignedToUid = cleanText(req.body.assignedToUid, 128);
        if (!assignedToUid) throw Object.assign(new Error('El responsable debe ser una cuenta activa.'), { status: 400 });
        const members = await transaction.get(db.collection('memberships').where('uid', '==', assignedToUid));
        if (!members.docs.some((doc) => doc.data().centerId === centerId && doc.data().status === 'active' && doc.data().roles?.includes(task.recipientRole))) throw Object.assign(new Error('El responsable no tiene una membresía activa con el perfil destinatario.'), { status: 400 });
      }
      if (status === 'accepted' && !assignedToUid) assignedToUid = actor.uid;
      if (status === 'accepted' && status !== task.status && assignedToUid !== actor.uid) throw Object.assign(new Error('Sólo el responsable asignado puede aceptar la gestión.'), { status: 403 });
      let keyRef; let slot;
      if (['resolved', 'rejected'].includes(status) && status !== task.status) {
        keyRef = activeTaskRef(centerId, task);
        slot = await transaction.get(keyRef);
      }
      const update = compact({ status, version: (task.version || 1) + 1, ...(supplied(req.body, 'result') ? { result: cleanText(req.body.result, 1500), respondedByName: actor.name, respondedAt: new Date().toISOString() } : {}), assignedToUid, ...(status === 'accepted' && status !== task.status ? { acceptedByUid: actor.uid } : {}), ...(status === 'resolved' && status !== task.status ? { resolvedByUid: actor.uid } : {}), updatedAt: new Date().toISOString() });
      transaction.update(ref, update);
      if (slot?.exists && slot.data().taskId === id) transaction.delete(keyRef);
      auditIn(transaction, centerId, actor, 'task.updated', 'task', id, { from: task.status, to: status });
      saved = { id, ...task, ...update };
    });
    return send(res, 200, { task: hasAnyRole(member, PRIMARY_CLINICAL_ROLES) || member.roles.includes(saved.recipientRole) ? saved : workflow.operationalTask(saved) });

  }

  const whatsappMatch = subpath.match(/^\/tasks\/([^/]+)\/whatsapp$/);
  if (whatsappMatch && method === 'POST') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']); const center = await db.doc(`centers/${centerId}`).get(); const phone = String(center.data()?.whatsappNumber || '').replace(/\D/g, '');
    if (!phone) throw Object.assign(new Error('El centro no tiene un número de WhatsApp configurado.'), { status: 400 });
    const task = await db.doc(`centers/${centerId}/tasks/${whatsappMatch[1]}`).get(); if (!task.exists) throw Object.assign(new Error('Tarea no encontrada.'), { status: 404 });
    const message = `Equipo de Pie Diabético: existe una nueva gestión ${task.data().priority} en la plataforma. Ingrese con su cuenta institucional para revisar los antecedentes. No se incluyen datos clínicos por este canal.`;
    await audit(centerId, actor, 'task.whatsapp_prepared', 'task', task.id); return send(res, 200, { url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`, message });
  }

  if (subpath === '/audit' && method === 'GET') {
    requireRole(member, ['center_admin', 'coordinator', 'auditor']); const snapshot = await db.collection(`centers/${centerId}/auditLogs`).orderBy('createdAt', 'desc').limit(200).get();
    return send(res, 200, { events: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  }
  throw Object.assign(new Error('Ruta no encontrada.'), { status: 404 });
}

exports.api = onRequest({ region: 'southamerica-west1', memory: '512MiB', timeoutSeconds: 60, maxInstances: 10, invoker: 'public' }, async (req, res) => {
  const requestId = requestIdFromReq(req);
  req.apiRequestId = requestId;
  try {
    await setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).send('');
    res.set('X-Request-Id', requestId).set('Access-Control-Expose-Headers', 'X-Request-Id');
    const requestPath = req.path.replace(/^\/api/, '') || '/';
    const publicRequest = requestPath === '/health' || /^\/public\/centers\/[^/]+\/logo$/.test(requestPath);
    const actor = publicRequest ? null : await actorFromRequest(req);
    return await route(req, res, actor);
  } catch (error) {
    const status = error?.status ?? (error?.code?.startsWith?.('auth/') ? 401 : 500);
    if (routeFamily(req.path) === 'center.members' && ['POST', 'PUT'].includes(req.method)) {
      const event = {
        event: 'member_access_change', result: 'failed', requestId, operationId: req.memberOperationId || null,
        actorUid: req.verifiedActorUid || null, centerId: req.authorizedCenterId || null,
        method: req.method, status,
      };
      if (status >= 500) logger.error('member_access_change', event);
      else logger.warn('member_access_change', event);
    }
    if (status === 401 || status === 403) {
      logger.warn('security_event', securityEvent(req, 'access.denied', status, error?.auditReason));
    } else {
      logger.error('api_error', { requestId, status, route: routeFamily(req.path) });
    }
    const memberChange = routeFamily(req.path) === 'center.members' && ['POST', 'PUT'].includes(req.method);
    const reportedError = memberChange
      ? { requestId, code: status >= 500 ? 'internal_error' : error?.code, message: status >= 500 ? 'No se pudo confirmar el cambio de acceso. Revisa el equipo antes de reintentar.' : error?.message }
      : { ...error, requestId };
    return send(res, status, requestErrorPayload({ apiRequestId: requestId }, status, reportedError));
  }
});
