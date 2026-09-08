import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_API_KEY ? import.meta.env.VITE_FIREBASE_API_KEY : 'AIzaSyBItYxeFIbQBM6d5cEgsZYQFn20l7k0-84',
  // Keep the OAuth helper on the same Firebase Hosting origin. This avoids
  // third-party storage restrictions on current mobile and desktop browsers.
  authDomain: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : 'policlinico-de-pie-diabetico.web.app',
  projectId: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_PROJECT_ID ? import.meta.env.VITE_FIREBASE_PROJECT_ID : 'policlinico-de-pie-diabetico',
  storageBucket: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : 'policlinico-de-pie-diabetico.firebasestorage.app',
  messagingSenderId: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '953735305510',
  appId: import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APP_ID ? import.meta.env.VITE_FIREBASE_APP_ID : '1:953735305510:web:38664e3d6938618a6909e7',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

void setPersistence(auth, browserLocalPersistence);
