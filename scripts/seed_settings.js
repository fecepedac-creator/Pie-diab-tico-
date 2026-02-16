
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../service-account.json');

async function seedSettings() {
    console.log('Seeding clinical settings...');

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error('ERROR: service-account.json not found!');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore(process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id);

    const config = {
        activeScales: {
            wifi: true,
            wagner: false,
            texas: false
        },
        updatedAt: new Date().toISOString(),
        updatedBy: 'system'
    };

    try {
        await db.collection('pd_settings').doc('clinical_config').set(config);
        console.log('SUCCESS: Clinical configuration seeded.');
    } catch (error) {
        console.error('Seed failed:', error);
    }
}

seedSettings();
