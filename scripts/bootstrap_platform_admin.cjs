const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const arg = (name) => { const index = process.argv.indexOf(`--${name}`); return index >= 0 ? process.argv[index + 1] : ''; };
const email = arg('email').trim().toLowerCase(); const centerName = arg('center').trim() || 'Equipo de Pie Diabético';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usa --email correo@institucion.cl');
initializeApp({ credential: applicationDefault() });
const db = getFirestore(); const hash = crypto.createHash('sha256').update(email).digest('hex'); const now = new Date().toISOString();
(async () => {
  const adminRef = db.doc(`platform_admins/${hash}`); const centers = await db.collection('centers').limit(1).get(); const centerRef = centers.empty ? db.collection('centers').doc() : centers.docs[0].ref; const memberRef = db.doc(`memberships/${centerRef.id}_${hash}`); const batch = db.batch();
  batch.set(adminRef, { emailLower: email, status: 'active', updatedAt: now, createdAt: now }, { merge: true });
  if (centers.empty) batch.set(centerRef, { id: centerRef.id, name: centerName, code: 'PDM-01', allowedDomains: [], status: 'active', createdAt: now, updatedAt: now });
  batch.set(memberRef, { id: memberRef.id, centerId: centerRef.id, email, emailLower: email, displayName: email.split('@')[0], roles: ['center_admin', 'doctor'], status: 'invited', createdAt: now, updatedAt: now }, { merge: true });
  await batch.commit(); console.log(JSON.stringify({ ok: true, centerId: centerRef.id, email }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
