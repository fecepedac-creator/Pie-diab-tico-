import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../service-account.json');

const defaultCenterId = process.env.DEFAULT_CENTER_ID || 'default-center';
const defaultCenterName = process.env.DEFAULT_CENTER_NAME || 'Centro por Defecto';

async function migrateCenterIds() {
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('ERROR: service-account.json not found!');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  await db.collection('pd_centers').doc(defaultCenterId).set({
    name: defaultCenterName,
    modules: ['dashboard', 'patients', 'alerts', 'settings', 'camera'],
    enabledRoles: ['Admin', 'Médico Diabetología', 'Enfermería', 'Cirugía General', 'Cirugía Vascular', 'Fisiatría', 'Asistente Social', 'TENS / Paramédico', 'Auditor'],
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const users = await db.collection('pd_users').get();
  const counts = { patients: 0, episodes: 0, visits: 0, referrals: 0, memberships: 0, clinicalConfigMoved: 0 };

  for (const userDoc of users.docs) {
    const role = userDoc.data().role || 'Médico Diabetología';
    await db.collection('pd_centers').doc(defaultCenterId).collection('users').doc(userDoc.id).set({
      uid: userDoc.id,
      roles: [role],
      isActive: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    counts.memberships += 1;
  }

  const collections = ['patients', 'episodes', 'visits', 'referrals'];

  for (const key of collections) {
    const colName = `pd_${key}`;
    const snapshot = await db.collection(colName).get();
    let batch = db.batch();
    let ops = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (!data.centerId) {
        batch.set(doc.ref, { centerId: defaultCenterId }, { merge: true });
        counts[key] += 1;
        ops += 1;
      }
      if (ops >= 400) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();
  }

  const legacyConfig = await db.collection('pd_settings').doc('clinical_config').get();
  if (legacyConfig.exists) {
    await db.collection('pd_centers').doc(defaultCenterId).collection('settings').doc('clinical_config').set(legacyConfig.data(), { merge: true });
    counts.clinicalConfigMoved = 1;
  }

  console.log('Migration complete');
  console.log(JSON.stringify(counts, null, 2));
}

migrateCenterIds().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
