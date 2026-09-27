import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';

const projectId = JSON.parse(readFileSync(new URL('../.firebaserc', import.meta.url), 'utf8')).projects?.canary;
const forbidden = new Set(['policlinico-de-pie-diabetico', 'simulador-clinico', 'simulador-clinico-2']);
if (!projectId || forbidden.has(projectId)) throw new Error('Configura un alias canary exclusivo para Pie Diabético antes de compilar.');

const env = loadEnv('canary', process.cwd(), 'VITE_');
if (env.VITE_API_URL !== '/api') throw new Error('VITE_API_URL debe ser /api');
if (env.VITE_FIREBASE_PROJECT_ID !== projectId) throw new Error('El proyecto web no coincide con el alias canary.');
if (!['web.app', 'firebaseapp.com'].some((suffix) => env.VITE_FIREBASE_AUTH_DOMAIN === `${projectId}.${suffix}`)) throw new Error('Auth Domain no pertenece al canary.');
if (!env.VITE_FIREBASE_API_KEY?.trim()) throw new Error('Falta VITE_FIREBASE_API_KEY del proyecto canary.');
if (!env.VITE_FIREBASE_MESSAGING_SENDER_ID?.match(/^\d+$/)) throw new Error('Falta el identificador de mensajería del canary.');
if (!env.VITE_GOOGLE_CLIENT_ID?.match(new RegExp(`^${env.VITE_FIREBASE_MESSAGING_SENDER_ID}-[a-z0-9]+\\.apps\\.googleusercontent\\.com$`))) throw new Error('El cliente OAuth de Google no pertenece al canary.');
if (!env.VITE_FIREBASE_APP_ID?.startsWith(`1:${env.VITE_FIREBASE_MESSAGING_SENDER_ID}:web:`)) throw new Error('App ID y sender ID no coinciden.');
if (!['appspot.com', 'firebasestorage.app'].some((suffix) => env.VITE_FIREBASE_STORAGE_BUCKET === `${projectId}.${suffix}`)) throw new Error('Storage Bucket no pertenece al canary.');
if (Object.values(env).some((value) => [...forbidden].some((id) => String(value).includes(id)))) throw new Error('La configuración contiene una referencia a otro proyecto.');

console.log(`Configuración de compilación canary verificada para ${projectId}.`);
