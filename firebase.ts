
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBItYxeFIbQBM6d5cEgsZYQFn20l7k0-84",
    authDomain: "policlinico-de-pie-diabetico.firebaseapp.com",
    projectId: "policlinico-de-pie-diabetico",
    storageBucket: "policlinico-de-pie-diabetico.firebasestorage.app",
    messagingSenderId: "953735305510",
    appId: "1:953735305510:web:38664e3d6938618a6909e7",
    measurementId: "G-XZBCB7N6B1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
