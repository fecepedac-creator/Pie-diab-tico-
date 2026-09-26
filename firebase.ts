import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBItYxeFIbQBM6d5cEgsZYQFn20l7k0-84',
  // Keep the OAuth helper on the same Firebase Hosting origin. This avoids
  // third-party storage restrictions on current mobile and desktop browsers.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'policlinico-de-pie-diabetico.web.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'policlinico-de-pie-diabetico',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'policlinico-de-pie-diabetico.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '953735305510',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:953735305510:web:38664e3d6938618a6909e7',
};

if (import.meta.env.DEV && firebaseConfig.projectId !== 'demo-pie-diabetico') {
  throw new Error('El desarrollo local sólo admite el proyecto sintético demo-pie-diabetico.');
}

export const localReviewAuthEnabled = import.meta.env.DEV && firebaseConfig.projectId === 'demo-pie-diabetico';

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
if (localReviewAuthEnabled) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
export const authPersistenceReady = setPersistence(auth, browserLocalPersistence);
