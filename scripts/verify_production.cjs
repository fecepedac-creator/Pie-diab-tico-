const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) throw new Error('Indica el correo a verificar.');
initializeApp({ credential: applicationDefault() }); const db = getFirestore();

(async () => {
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  const [admin, memberships, health, unauthorized, html] = await Promise.all([
    db.doc(`platform_admins/${hash}`).get(),
    db.collection('memberships').where('emailLower', '==', email).get(),
    fetch('https://policlinico-de-pie-diabetico.web.app/api/health'),
    fetch('https://policlinico-de-pie-diabetico.web.app/api/session'),
    fetch('https://policlinico-de-pie-diabetico.web.app/'),
  ]);
  assert.equal(admin.exists && admin.data().status === 'active', true); assert.equal(memberships.empty, false);
  assert.equal(health.status, 200); assert.equal((await health.json()).status, 'ok'); assert.equal(unauthorized.status, 401); assert.equal(html.status, 200);
  const source = await html.text(); const assetPath = source.match(/src="([^"]+\.js)"/)?.[1]; assert(assetPath);
  const bundle = await (await fetch(`https://policlinico-de-pie-diabetico.web.app${assetPath}`)).text();
  assert.equal(bundle.includes('localhost:4000'), false); assert.equal(bundle.includes('generativelanguage.googleapis.com'), false); assert.equal(bundle.includes('Peda1986'), false);
  console.log(JSON.stringify({ ok: true, health: 200, anonymousSession: 401, platformAdmin: true, centerRoles: memberships.docs.map((doc) => doc.data().roles), assetPath }));
})().catch((error) => { console.error(error); process.exitCode = 1; });
