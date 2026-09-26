import { loadEnv } from 'vite';

const env = loadEnv('canary', process.cwd(), 'VITE_');
const expected = {
  VITE_API_URL: '/api',
  VITE_FIREBASE_PROJECT_ID: 'simulador-clinico',
  VITE_FIREBASE_AUTH_DOMAIN: 'simulador-clinico.web.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '328428681603',
  VITE_FIREBASE_APP_ID: '1:328428681603:web:f0dab1f3ed8283be9b1eb6',
};

for (const [name, value] of Object.entries(expected)) {
  if (env[name] !== value) throw new Error(`${name} debe ser ${value}`);
}
if (!env.VITE_FIREBASE_API_KEY?.trim()) throw new Error('Falta VITE_FIREBASE_API_KEY del proyecto canary');
if (!/^simulador-clinico\.(appspot\.com|firebasestorage\.app)$/.test(env.VITE_FIREBASE_STORAGE_BUCKET || '')) {
  throw new Error('VITE_FIREBASE_STORAGE_BUCKET no pertenece al proyecto canary');
}
if (Object.values(env).some((value) => String(value).includes('policlinico-de-pie-diabetico'))) {
  throw new Error('La configuración contiene una referencia al proyecto principal');
}

console.log('Configuración de compilación canary verificada para simulador-clinico.');
