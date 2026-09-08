const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const crypto = require('node:crypto');
const {
  CLINICAL_ROLES, DOCTOR_ROLES, cleanText, cleanEmail, hashEmail, normalizeRut,
  isValidRut, cleanStringArray, cleanDetailMap, sanitizeRoles, stamp, emptyWound, emptyWifi,
  emptyNursing, emptyMedical, nursingNarrative, medicalNarrative,
} = require('./domain');

initializeApp();
const db = getFirestore();
const auth = getAuth();

const ALLOWED_ORIGINS = new Set([
  'https://policlinico-de-pie-diabetico.web.app',
  'https://policlinico-de-pie-diabetico.firebaseapp.com',
  'https://policlinico-pie--policlinico-de-pie-diabetico.us-east4.hosted.app',
  'http://localhost:5173', 'http://127.0.0.1:5173',
]);

function send(res, status, payload) {
  res.status(status).set('Cache-Control', 'no-store').json(payload);
}

function setCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
}

async function actorFromRequest(req) {
  const match = (req.get('authorization') || '').match(/^Bearer (.+)$/);
  if (!match) throw Object.assign(new Error('Debes iniciar sesión.'), { status: 401 });
  const decoded = await auth.verifyIdToken(match[1]);
  if (!decoded.email || decoded.email_verified !== true) {
    throw Object.assign(new Error('Se requiere un correo verificado.'), { status: 403 });
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
    if (!centerSnap.exists || centerSnap.data().status !== 'active') throw Object.assign(new Error('Este centro no se encuentra activo.'), { status: 403 });
    if (!snap.exists || snap.data().status === 'disabled') throw Object.assign(new Error('No tienes acceso activo a este centro.'), { status: 403 });
    if (snap.data().uid && snap.data().uid !== actor.uid) throw Object.assign(new Error('La invitación está vinculada a otra cuenta.'), { status: 403 });
    const now = new Date().toISOString(); const update = { uid: actor.uid, status: 'active', lastAccessAt: now, updatedAt: now };
    transaction.update(ref, update);
    return { id: snap.id, ...snap.data(), ...update };
  });
}

function requireRole(member, roles) {
  if (!member.roles.some((role) => roles.includes(role))) {
    throw Object.assign(new Error('Tu perfil no permite realizar esta acción.'), { status: 403 });
  }
}

async function audit(centerId, actor, action, targetType, targetId, details = {}) {
  const ref = db.collection(`centers/${centerId}/auditLogs`).doc();
  await ref.set({ centerId, action, actorUid: actor.uid, actorEmail: actor.email, targetType, targetId, details, createdAt: new Date().toISOString() });
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
    lengthCm: safeNumber(candidate.lengthCm, 0, 100), widthCm: safeNumber(candidate.widthCm, 0, 100), depthCm: safeNumber(candidate.depthCm, 0, 30),
    granulationPercent: safeNumber(candidate.granulationPercent, 0, 100), sloughPercent: safeNumber(candidate.sloughPercent, 0, 100), necrosisPercent: safeNumber(candidate.necrosisPercent, 0, 100),
    exudate: ['none', 'low', 'moderate', 'high'].includes(candidate.exudate) ? candidate.exudate : undefined,
    odor: ['none', 'present'].includes(candidate.odor) ? candidate.odor : undefined,
    edges: cleanStringArray(candidate.edges), periwound: cleanStringArray(candidate.periwound), exposedStructures: cleanStringArray(candidate.exposedStructures), infectionSigns: cleanStringArray(candidate.infectionSigns),
    painScore: safeNumber(candidate.painScore, 0, 10), notes: cleanText(candidate.notes, 1000),
    verification: stamp(actor, candidate.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification),
  });
}

function sanitizeWifi(input, actor, previous = emptyWifi()) {
  const level = (value) => [0, 1, 2, 3].includes(Number(value)) ? Number(value) : undefined;
  return compact({ wound: level(input?.wound), ischemia: level(input?.ischemia), footInfection: level(input?.footInfection), abi: safeNumber(input?.abi, 0, 3), toePressure: safeNumber(input?.toePressure, 0, 300), rationale: cleanText(input?.rationale, 1000), verification: stamp(actor, input?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification) });
}

function sanitizeNursing(input, actor, previous = emptyNursing()) {
  return compact({ cleaning: cleanStringArray(input?.cleaning), debridement: cleanStringArray(input?.debridement), primaryDressings: cleanStringArray(input?.primaryDressings), secondaryDressings: cleanStringArray(input?.secondaryDressings), periwoundProtection: cleanStringArray(input?.periwoundProtection), advancedTherapies: cleanStringArray(input?.advancedTherapies), offloadingApplied: cleanStringArray(input?.offloadingApplied), education: cleanStringArray(input?.education), tolerance: cleanText(input?.tolerance, 500), notes: cleanText(input?.notes, 1000), verification: stamp(actor, input?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification) });
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
    return send(res, 200, { user: actor, platformAdmin, memberships: active, centers: await withCenterLogoUrls(centers) });
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
      const batch = db.batch(); batch.set(ref, center); batch.set(db.doc(`memberships/${memberId}`), member);
      try { await batch.commit(); } catch (error) { if (logoFile) await logoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
      await audit(ref.id, actor, 'center.created', 'center', ref.id, { adminEmail });
      return send(res, 201, { center: (await withCenterLogoUrls([center]))[0] });
    }
  }

  const platformCenter = path.match(/^\/platform\/centers\/([^/]+)$/);
  if (platformCenter && method === 'PUT') {
    if (!(await isPlatformAdmin(actor))) throw Object.assign(new Error('Acceso exclusivo de administración de plataforma.'), { status: 403 });
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
    try { await ref.update(firestoreUpdate); } catch (error) { if (uploadedLogoFile) await uploadedLogoFile.delete({ ignoreNotFound: true }).catch(() => undefined); throw error; }
    if (oldLogoPath && oldLogoPath !== nextLogoPath) await getStorage().bucket().file(oldLogoPath).delete({ ignoreNotFound: true }).catch(() => undefined);
    await audit(centerId, actor, 'center.updated', 'center', centerId, compact({ status: responseUpdate.status }));
    const center = { id: centerId, ...previous, ...responseUpdate }; if (!nextLogoPath) delete center.logoStoragePath; if (restoringArchived) { delete center.archivedAt; delete center.archivedByUid; }
    return send(res, 200, { center: (await withCenterLogoUrls([center]))[0] });
  }

  if (platformCenter && method === 'DELETE') {
    if (!(await isPlatformAdmin(actor))) throw Object.assign(new Error('Acceso exclusivo de administración de plataforma.'), { status: 403 });
    const centerId = platformCenter[1]; const ref = db.doc(`centers/${centerId}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Centro no encontrado.'), { status: 404 });
    const update = { status: 'archived', archivedAt: new Date().toISOString(), archivedByUid: actor.uid, updatedAt: new Date().toISOString() };
    await ref.update(update); await audit(centerId, actor, 'center.archived', 'center', centerId);
    return send(res, 200, { center: { id: centerId, ...snap.data(), ...update } });
  }

  const centerMatch = path.match(/^\/centers\/([^/]+)(\/.*)?$/);
  if (!centerMatch) throw Object.assign(new Error('Ruta no encontrada.'), { status: 404 });
  const centerId = centerMatch[1]; const subpath = centerMatch[2] || '';
  const member = await membershipFor(centerId, actor);

  if (subpath === '/settings' && method === 'PUT') {
    requireRole(member, ['center_admin']); const ref = db.doc(`centers/${centerId}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Centro no encontrado.'), { status: 404 });
    const update = compact({ name: cleanText(req.body?.name, 120) || snap.data().name, region: cleanText(req.body?.region, 80), address: cleanText(req.body?.address, 200), whatsappNumber: cleanText(req.body?.whatsappNumber, 30), updatedAt: new Date().toISOString() });
    await ref.update(update); await audit(centerId, actor, 'center.settings_updated', 'center', centerId); return send(res, 200, { center: { id: centerId, ...snap.data(), ...update } });
  }

  if (subpath === '/members') {
    requireRole(member, ['center_admin']);
    if (method === 'GET') return send(res, 200, { members: await docs(db.collection('memberships').where('centerId', '==', centerId)) });
    if (method === 'POST') {
      const email = cleanEmail(req.body?.email); const roles = sanitizeRoles(req.body?.roles);
      if (!roles.length) throw Object.assign(new Error('Selecciona al menos un perfil.'), { status: 400 });
      const id = `${centerId}_${hashEmail(email)}`; const ref = db.doc(`memberships/${id}`); const previous = await ref.get(); const now = new Date().toISOString();
      const invited = { id, centerId, email, emailLower: email, displayName: cleanText(req.body?.displayName || email, 120), roles, status: previous.exists && previous.data().uid ? 'active' : 'invited', ...(previous.exists && previous.data().uid ? { uid: previous.data().uid } : {}), createdAt: previous.exists ? previous.data().createdAt : now, updatedAt: now };
      await ref.set(invited); await audit(centerId, actor, previous.exists ? 'member.updated' : 'member.invited', 'membership', id, { email, roles });
      return send(res, previous.exists ? 200 : 201, { member: invited });
    }
  }

  const memberMatch = subpath.match(/^\/members\/([^/]+)$/);
  if (memberMatch && method === 'PUT') {
    requireRole(member, ['center_admin']); const id = memberMatch[1]; const ref = db.doc(`memberships/${id}`); const snap = await ref.get();
    if (!snap.exists || snap.data().centerId !== centerId) throw Object.assign(new Error('Miembro no encontrado.'), { status: 404 });
    const update = compact({ roles: req.body?.roles ? sanitizeRoles(req.body.roles) : undefined, status: ['invited', 'active', 'disabled'].includes(req.body?.status) ? req.body.status : undefined, updatedAt: new Date().toISOString() });
    if (update.roles && !update.roles.length) throw Object.assign(new Error('Debe conservar al menos un perfil.'), { status: 400 });
    await ref.update(update); await audit(centerId, actor, 'member.updated', 'membership', id, update);
    return send(res, 200, { member: { id, ...snap.data(), ...update } });
  }

  if (subpath === '/state' && method === 'GET') {
    requireRole(member, [...CLINICAL_ROLES, 'auditor']);
    const [patients, episodes, encounterDocs, tasks, attachmentDocs] = await Promise.all([docs(db.collection(`centers/${centerId}/patients`)), docs(db.collection(`centers/${centerId}/episodes`)), docs(db.collection(`centers/${centerId}/encounters`)), docs(db.collection(`centers/${centerId}/tasks`)), docs(db.collection(`centers/${centerId}/attachments`))]);
    return send(res, 200, { patients: await withPatientPhotoUrls(patients), episodes, encounters: await withPhotoUrls(encounterDocs), tasks, attachments: await withAttachmentUrls(attachmentDocs) });
  }

  if (subpath === '/patients' && method === 'POST') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']);
    const rut = normalizeRut(req.body?.rut); const name = cleanText(req.body?.name, 150);
    if (!isValidRut(rut) || !name) throw Object.assign(new Error('Nombre y RUT válido son obligatorios.'), { status: 400 });
    const duplicate = await db.collection(`centers/${centerId}/patients`).where('rut', '==', rut).limit(1).get();
    if (!duplicate.empty) throw Object.assign(new Error('El paciente ya existe en este centro.'), { status: 409 });
    const ref = db.collection(`centers/${centerId}/patients`).doc(); const now = new Date().toISOString();
    const patient = { id: ref.id, centerId, rut, name, birthDate: cleanText(req.body?.birthDate, 10), contact: cleanText(req.body?.contact, 40), comuna: cleanText(req.body?.comuna, 80), preAdmissionStatus: 'minimal', anamnesis: { medicalHistory: [], medicalHistoryDetails: {}, surgicalHistory: [], surgicalHistoryDetails: {}, allergyStatus: 'unknown', allergies: [], medications: [] }, social: {}, verification: stamp(actor), createdAt: now, updatedAt: now };
    await ref.set(compact(patient)); await audit(centerId, actor, 'patient.created', 'patient', ref.id);
    return send(res, 201, { patient: compact(patient) });
  }

  const patientPhotoMatch = subpath.match(/^\/patients\/([^/]+)\/photo$/);
  if (patientPhotoMatch && method === 'POST') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']);
    const id = patientPhotoMatch[1]; const ref = db.doc(`centers/${centerId}/patients/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
    const match = String(req.body?.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Formato de imagen no permitido.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('La imagen supera el máximo de 5 MB.'), { status: 413 });
    const photoId = crypto.randomUUID(); const ext = match[1].split('/')[1]; const photoStoragePath = `centers/${centerId}/patients/${id}/profile/${photoId}.${ext}`;
    await getStorage().bucket().file(photoStoragePath).save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const updatedAt = new Date().toISOString(); await ref.update({ photoStoragePath, updatedAt });
    await audit(centerId, actor, 'patient.photo.updated', 'patient', id);
    const patient = { id, ...snap.data(), photoStoragePath, updatedAt };
    return send(res, 201, { patient: (await withPatientPhotoUrls([patient]))[0] });
  }

  const patientMatch = subpath.match(/^\/patients\/([^/]+)$/);
  if (patientMatch && method === 'PUT') {
    requireRole(member, ['coordinator', 'nurse', 'doctor', 'social_worker', 'physiatrist']);
    const id = patientMatch[1]; const ref = db.doc(`centers/${centerId}/patients/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
    const previous = snap.data(); const a = req.body?.anamnesis || {}; const s = req.body?.social || {};
    const medicalHistory = cleanStringArray(a.medicalHistory); const surgicalHistory = cleanStringArray(a.surgicalHistory);
    const allergyStatus = ['unknown', 'none', 'present'].includes(a.allergyStatus) ? a.allergyStatus : (previous.anamnesis?.allergyStatus || 'unknown');
    const update = compact({ name: cleanText(req.body?.name, 150) || previous.name, birthDate: cleanText(req.body?.birthDate, 10), contact: cleanText(req.body?.contact, 40), comuna: cleanText(req.body?.comuna, 80), preAdmissionStatus: ['minimal', 'in_progress', 'validated'].includes(req.body?.preAdmissionStatus) ? req.body.preAdmissionStatus : previous.preAdmissionStatus, anamnesis: { diabetesTreatment: cleanText(a.diabetesTreatment, 500), medicalHistory, medicalHistoryDetails: cleanDetailMap(a.medicalHistoryDetails, medicalHistory), surgicalHistory, surgicalHistoryDetails: cleanDetailMap(a.surgicalHistoryDetails, surgicalHistory), allergyStatus, allergies: allergyStatus === 'none' ? [] : cleanStringArray(a.allergies), medications: cleanStringArray(a.medications), smoking: cleanText(a.smoking, 200), alcoholUse: cleanText(a.alcoholUse, 120), alcoholDetails: cleanText(a.alcoholDetails, 500), substanceUse: cleanText(a.substanceUse, 120), substanceDetails: cleanText(a.substanceDetails, 500), renalDisease: cleanText(a.renalDisease, 300), vascularHistory: cleanText(a.vascularHistory, 500), neuropathy: cleanText(a.neuropathy, 300), previousAmputations: cleanText(a.previousAmputations, 300) }, social: { supportNetwork: cleanText(s.supportNetwork, 500), mobility: cleanText(s.mobility, 300), transportBarriers: cleanText(s.transportBarriers, 500), housingBarriers: cleanText(s.housingBarriers, 500), notes: cleanText(s.notes, 1000) }, verification: stamp(actor, req.body?.verification?.status === 'confirmed' ? 'confirmed' : 'draft', previous.verification), updatedAt: new Date().toISOString() });
    await ref.update(update); await audit(centerId, actor, 'patient.updated', 'patient', id);
    return send(res, 200, { patient: { id, ...previous, ...update } });
  }

  if (subpath === '/episodes' && method === 'POST') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']); const patientId = cleanText(req.body?.patientId, 60);
    if (!(await db.doc(`centers/${centerId}/patients/${patientId}`).get()).exists) throw Object.assign(new Error('Paciente no encontrado.'), { status: 404 });
    if (!['right', 'left'].includes(req.body?.side) || !cleanText(req.body?.location, 120)) throw Object.assign(new Error('Lado y ubicación de la herida son obligatorios.'), { status: 400 });
    const ref = db.collection(`centers/${centerId}/episodes`).doc(); const now = new Date().toISOString();
    const episode = { id: ref.id, centerId, patientId, side: req.body.side, location: cleanText(req.body.location, 120), onsetDate: cleanText(req.body?.onsetDate, 10), etiology: cleanText(req.body?.etiology, 300), referralSource: cleanText(req.body?.referralSource, 200), status: 'active', priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : 'routine', consentForPhotography: req.body?.consentForPhotography === true, createdAt: now, updatedAt: now };
    await ref.set(compact(episode)); await audit(centerId, actor, 'episode.created', 'episode', ref.id);
    return send(res, 201, { episode: compact(episode) });
  }

  const episodeMatch = subpath.match(/^\/episodes\/([^/]+)$/);
  if (episodeMatch && method === 'PUT') {
    requireRole(member, ['coordinator', 'nurse', 'doctor']); const id = episodeMatch[1]; const ref = db.doc(`centers/${centerId}/episodes/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Episodio no encontrado.'), { status: 404 });
    const update = compact({ status: ['active', 'healed', 'referred', 'closed'].includes(req.body?.status) ? req.body.status : undefined, priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : undefined, consentForPhotography: typeof req.body?.consentForPhotography === 'boolean' ? req.body.consentForPhotography : undefined, updatedAt: new Date().toISOString() });
    await ref.update(update); await audit(centerId, actor, 'episode.updated', 'episode', id); return send(res, 200, { episode: { id, ...snap.data(), ...update } });
  }

  if (subpath === '/encounters' && method === 'POST') {
    requireRole(member, ['coordinator', 'tens', 'nurse', 'doctor']); const patientId = cleanText(req.body?.patientId, 60); const episodeId = cleanText(req.body?.episodeId, 60);
    const [patient, episode] = await Promise.all([db.doc(`centers/${centerId}/patients/${patientId}`).get(), db.doc(`centers/${centerId}/episodes/${episodeId}`).get()]);
    if (!patient.exists || !episode.exists || episode.data().patientId !== patientId) throw Object.assign(new Error('Paciente o episodio no válido.'), { status: 400 });
    const ref = db.collection(`centers/${centerId}/encounters`).doc(); const now = new Date().toISOString();
    const encounter = { id: ref.id, centerId, patientId, episodeId, encounterDate: cleanText(req.body?.encounterDate, 30) || now, status: 'in_progress', wound: emptyWound(), wifi: emptyWifi(), nursing: emptyNursing(), medical: emptyMedical(), photos: [], version: 1, createdAt: now, updatedAt: now };
    encounter.nursingNarrative = nursingNarrative(encounter); encounter.medicalNarrative = medicalNarrative(encounter);
    await ref.set(encounter); await audit(centerId, actor, 'encounter.created', 'encounter', ref.id); return send(res, 201, { encounter });
  }

  const encounterMatch = subpath.match(/^\/encounters\/([^/]+)$/);
  if (encounterMatch && method === 'PUT') {
    const id = encounterMatch[1]; const ref = db.doc(`centers/${centerId}/encounters/${id}`); let saved;
    await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref); if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 }); const previous = snap.data();
      if (Number(req.body?.version) !== previous.version) throw Object.assign(new Error('Otro profesional actualizó esta atención. Recarga antes de guardar.'), { status: 409 });
      const update = { updatedAt: new Date().toISOString(), version: previous.version + 1 };
      if (req.body?.wound) { requireRole(member, [...DOCTOR_ROLES, 'nurse']); update.wound = sanitizeWound(req.body.wound, actor, previous.wound); }
      if (req.body?.wifi) { requireRole(member, DOCTOR_ROLES); update.wifi = sanitizeWifi(req.body.wifi, actor, previous.wifi); }
      if (req.body?.nursing) { requireRole(member, ['nurse']); update.nursing = sanitizeNursing(req.body.nursing, actor, previous.nursing); }
      if (req.body?.medical) { requireRole(member, DOCTOR_ROLES); update.medical = sanitizeMedical(req.body.medical, actor, previous.medical); }
      if (req.body?.status && ['draft', 'in_progress', 'ready_for_review', 'completed', 'cancelled'].includes(req.body.status)) { requireRole(member, [...DOCTOR_ROLES, 'nurse']); update.status = req.body.status; }
      saved = { id, ...previous, ...update }; saved.nursingNarrative = nursingNarrative(saved); saved.medicalNarrative = medicalNarrative(saved);
      transaction.update(ref, compact({ ...update, nursingNarrative: saved.nursingNarrative, medicalNarrative: saved.medicalNarrative }));
    });
    await audit(centerId, actor, 'encounter.updated', 'encounter', id, { sections: Object.keys(req.body || {}).filter((key) => key !== 'version') }); return send(res, 200, { encounter: saved });
  }

  const photoMatch = subpath.match(/^\/encounters\/([^/]+)\/photos$/);
  if (photoMatch && method === 'POST') {
    requireRole(member, ['tens', 'nurse', ...DOCTOR_ROLES]); const id = photoMatch[1]; const ref = db.doc(`centers/${centerId}/encounters/${id}`); const snap = await ref.get();
    if (!snap.exists) throw Object.assign(new Error('Atención no encontrada.'), { status: 404 });
    const episode = await db.doc(`centers/${centerId}/episodes/${snap.data().episodeId}`).get();
    if (!episode.exists || episode.data().consentForPhotography !== true) throw Object.assign(new Error('Debes registrar consentimiento para fotografías antes de capturar.'), { status: 400 });
    const match = String(req.body?.dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Formato de imagen no permitido.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64'); if (buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('La imagen supera el máximo de 5 MB.'), { status: 413 });
    const kind = req.body?.kind === 'post' ? 'post' : 'pre'; const photoId = crypto.randomUUID(); const ext = match[1].split('/')[1]; const storagePath = `centers/${centerId}/patients/${snap.data().patientId}/encounters/${id}/${photoId}.${ext}`;
    await getStorage().bucket().file(storagePath).save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const photo = { id: photoId, kind, storagePath, capturedAt: new Date().toISOString(), capturedByUid: actor.uid, capturedByName: actor.name, mimeType: match[1], orientationConfirmed: req.body?.orientationConfirmed === true, scaleIncluded: req.body?.scaleIncluded === true, quality: 'pending' };
    await ref.update({ photos: FieldValue.arrayUnion(photo), updatedAt: new Date().toISOString(), version: FieldValue.increment(1) }); await audit(centerId, actor, 'photo.uploaded', 'encounter', id, { kind });
    const current = await ref.get(); return send(res, 201, { encounter: (await withPhotoUrls([{ id, ...current.data() }]))[0] });
  }

  const attachmentMatch = subpath.match(/^\/episodes\/([^/]+)\/attachments$/);
  if (attachmentMatch && method === 'POST') {
    requireRole(member, ['nurse', 'doctor', 'general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist']);
    const episodeId = attachmentMatch[1]; const episode = await db.doc(`centers/${centerId}/episodes/${episodeId}`).get();
    if (!episode.exists) throw Object.assign(new Error('Episodio no encontrado.'), { status: 404 });
    const data = String(req.body?.dataUrl || '');
    const match = data.match(/^data:(application\/pdf|image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw Object.assign(new Error('Sólo se permiten PDF, JPEG, PNG o WebP.'), { status: 400 });
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 10 * 1024 * 1024) throw Object.assign(new Error('El archivo supera el máximo de 10 MB.'), { status: 413 });
    const kind = ['laboratory', 'pvr', 'imaging', 'other'].includes(req.body?.kind) ? req.body.kind : 'other';
    const id = crypto.randomUUID(); const extension = match[1] === 'application/pdf' ? 'pdf' : match[1].split('/')[1]; const storagePath = `centers/${centerId}/patients/${episode.data().patientId}/episodes/${episodeId}/attachments/${id}.${extension}`;
    await getStorage().bucket().file(storagePath).save(buffer, { resumable: false, contentType: match[1], metadata: { cacheControl: 'private, max-age=0, no-store' } });
    const attachment = { id, centerId, patientId: episode.data().patientId, episodeId, kind, title: cleanText(req.body?.title, 160) || 'Documento clínico', storagePath, mimeType: match[1], uploadedByUid: actor.uid, uploadedByName: actor.name, createdAt: new Date().toISOString() };
    await db.doc(`centers/${centerId}/attachments/${id}`).set(attachment); await audit(centerId, actor, 'attachment.uploaded', 'attachment', id, { kind, episodeId });
    return send(res, 201, { attachment: (await withAttachmentUrls([attachment]))[0] });
  }

  if (subpath === '/tasks' && method === 'POST') {
    requireRole(member, ['coordinator', 'nurse', ...DOCTOR_ROLES, 'vascular_nurse', 'social_worker']);
    const recipientRole = sanitizeRoles([req.body?.recipientRole])[0]; const patientId = cleanText(req.body?.patientId, 60); const episodeId = cleanText(req.body?.episodeId, 60);
    if (!recipientRole || !patientId || !episodeId || !cleanText(req.body?.reason, 1000)) throw Object.assign(new Error('Destinatario, paciente, episodio y motivo son obligatorios.'), { status: 400 });
    const ref = db.collection(`centers/${centerId}/tasks`).doc(); const now = new Date().toISOString();
    const task = { id: ref.id, centerId, patientId, episodeId, encounterId: cleanText(req.body?.encounterId, 60), type: ['general_surgery', 'vascular', 'traumatology', 'physiatry', 'social', 'exam', 'other'].includes(req.body?.type) ? req.body.type : 'other', recipientRole, title: cleanText(req.body?.title, 160) || 'Nueva gestión clínica', reason: cleanText(req.body.reason, 1000), priority: ['routine', 'soon', 'urgent'].includes(req.body?.priority) ? req.body.priority : 'routine', dueAt: cleanText(req.body?.dueAt, 30), status: 'created', createdByUid: actor.uid, createdByName: actor.name, createdAt: now, updatedAt: now };
    await ref.set(compact(task)); await audit(centerId, actor, 'task.created', 'task', ref.id, { recipientRole, priority: task.priority }); return send(res, 201, { task: compact(task) });
  }

  const taskMatch = subpath.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch && method === 'PUT') {
    const id = taskMatch[1]; const ref = db.doc(`centers/${centerId}/tasks/${id}`); const snap = await ref.get(); if (!snap.exists) throw Object.assign(new Error('Tarea no encontrada.'), { status: 404 }); const task = snap.data();
    if (!(member.roles.includes(task.recipientRole) || member.roles.includes('coordinator') || member.roles.includes('center_admin') || task.createdByUid === actor.uid)) throw Object.assign(new Error('No puedes actualizar esta tarea.'), { status: 403 });
    const status = ['created', 'notified', 'accepted', 'in_progress', 'resolved', 'rejected'].includes(req.body?.status) ? req.body.status : undefined;
    const update = compact({ status, result: cleanText(req.body?.result, 1500), assignedToUid: cleanText(req.body?.assignedToUid, 128), ...(status === 'accepted' ? { acceptedByUid: actor.uid } : {}), ...(status === 'resolved' ? { resolvedByUid: actor.uid } : {}), updatedAt: new Date().toISOString() });
    await ref.update(update); await audit(centerId, actor, 'task.updated', 'task', id, { status }); return send(res, 200, { task: { id, ...task, ...update } });
  }

  const whatsappMatch = subpath.match(/^\/tasks\/([^/]+)\/whatsapp$/);
  if (whatsappMatch && method === 'POST') {
    requireRole(member, ['coordinator', 'nurse', ...DOCTOR_ROLES, 'vascular_nurse']); const center = await db.doc(`centers/${centerId}`).get(); const phone = String(center.data()?.whatsappNumber || '').replace(/\D/g, '');
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
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    const requestPath = req.path.replace(/^\/api/, '') || '/';
    const publicRequest = requestPath === '/health' || /^\/public\/centers\/[^/]+\/logo$/.test(requestPath);
    const actor = publicRequest ? null : await actorFromRequest(req);
    return await route(req, res, actor);
  } catch (error) {
    console.error('api_error', { message: error.message, path: req.path, status: error.status || 500 });
    return send(res, error.status || (error.code?.startsWith?.('auth/') ? 401 : 500), { error: error.status ? error.message : 'No fue posible completar la solicitud.' });
  }
});
