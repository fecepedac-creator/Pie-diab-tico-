
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, '../service-account.json');
const DATA_PATH = path.resolve(__dirname, '../server/data.json');

async function migrateAuth() {
    console.log('Starting Auth migration...');

    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));
    initializeApp({
        credential: cert(serviceAccount)
    });

    const auth = getAuth();

    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    for (const user of data.users) {
        console.log(`Migrating user: ${user.email}`);
        try {
            // Create user in Firebase Auth
            // We can't import the custom hash easily without knowing exact pbkdf2 settings for Firebase import
            // So we'll just set a dummy password 'temporal123' or ask the user to reset.
            // Better: creation with a known password for the user to login.
            await auth.createUser({
                uid: user.id,
                email: user.email,
                password: 'temporal123', // User should change this
                displayName: user.email.split('@')[0]
            });

            // Set custom claims for roles
            await auth.setCustomUserClaims(user.id, { role: user.role });

            console.log(`Successfully migrated ${user.email}`);
        } catch (e) {
            if (e.code === 'auth/email-already-exists') {
                console.log(`User ${user.email} already exists, updating claims...`);
                await auth.setCustomUserClaims(user.id, { role: user.role });
            } else {
                console.error(`Failed to migrate ${user.email}:`, e.message);
            }
        }
    }

    console.log('Auth migration complete. TEMPORARY PASSWORD for all users: temporal123');
}

migrateAuth();
