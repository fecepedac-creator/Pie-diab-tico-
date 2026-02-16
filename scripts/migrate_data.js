
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper for paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../server/data.json');
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../service-account.json');

async function migrate() {
    console.log('Starting ADMIN migration...');

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error('ERROR: service-account.json not found!');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

    console.log('Initializing Firebase Admin with project:', serviceAccount.project_id);

    const app = initializeApp({
        credential: cert(serviceAccount)
    });

    const db = getFirestore();

    if (!fs.existsSync(DATA_PATH)) {
        console.error('No data.json found!');
        return;
    }

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
    const batch = db.batch();
    let count = 0;

    // Migrate Users
    if (data.users) {
        console.log(`Staging ${data.users.length} users...`);
        for (const user of data.users) {
            if (!user.id) continue;
            const ref = db.collection('pd_users').doc(user.id);
            batch.set(ref, user);
            count++;
        }
    }

    // Migrate App State...
    if (data.appState) {
        const collections = {
            patients: 'pd_patients',
            episodes: 'pd_episodes',
            visits: 'pd_visits',
            referrals: 'pd_referrals'
        };

        for (const [key, colName] of Object.entries(collections)) {
            if (data.appState[key] && Array.isArray(data.appState[key])) {
                console.log(`Staging ${data.appState[key].length} ${key}...`);
                for (const item of data.appState[key]) {
                    if (!item.id) continue;
                    const ref = db.collection(colName).doc(item.id);
                    batch.set(ref, item);
                    count++;
                }
            }
        }
    }

    try {
        console.log('Committing batch...');
        await batch.commit();
        console.log(`SUCCESS: Migrated ${count} documents via Admin SDK.`);
    } catch (error) {
        console.error('Migration commit failed:', error);
    }
}

migrate();
