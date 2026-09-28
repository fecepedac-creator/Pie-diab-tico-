const crypto = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { options, createAudit, firestoreEvidence, DEMO_PROJECT } = require('./admin-operation-audit.cjs');

const config = options(process.argv.slice(2), ['email', 'center-id', 'center']);
if (config.project !== DEMO_PROJECT) throw new Error('Este bootstrap de privilegios sólo se permite en el emulador local.');
const email = (config.email || '').trim().toLowerCase();
const centerId = config['center-id'];
const centerName = config.center || 'Equipo de Pie Diabético';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Usa --email correo@institucion.cl.');
if (!/^[A-Za-z0-9_-]{3,80}$/.test(centerId || '')) throw new Error('Usa --center-id explícito.');
if (centerName.length > 100) throw new Error('Nombre de centro demasiado largo.');

async function main() {
  const app = initializeApp({ projectId: config.project });
  try {
    const db = getFirestore(app);
    const hash = crypto.createHash('sha256').update(email).digest('hex');
    const adminRef = db.doc(`platform_admins/${hash}`);
    const centerRef = db.doc(`centers/${centerId}`);
    const memberRef = db.doc(`memberships/${centerId}_${hash}`);
    const readEvidence = async () => {
      const [admin, center, member] = await db.getAll(adminRef, centerRef, memberRef);
      return { platformAdmin: firestoreEvidence(admin), center: firestoreEvidence(center), membership: firestoreEvidence(member) };
    };
    const run = createAudit(db, config);
    await run({
      action: 'platform_admin.bootstrap',
      resource: `centers/${centerId}`,
      readEvidence,
      mutate: async () => {
        const now = new Date().toISOString();
        const centerExists = (await centerRef.get()).exists;
        const batch = db.batch();
        batch.set(adminRef, { emailLower: email, status: 'active', updatedAt: now, createdAt: now }, { merge: true });
        if (!centerExists) batch.create(centerRef, { id: centerId, name: centerName, code: 'PDM-01', allowedDomains: [], status: 'active', createdAt: now, updatedAt: now });
        batch.set(memberRef, { id: memberRef.id, centerId, email, emailLower: email, displayName: email.split('@')[0], roles: ['center_admin', 'doctor'], status: 'invited', createdAt: now, updatedAt: now }, { merge: true });
        await batch.commit();
      },
    });
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
