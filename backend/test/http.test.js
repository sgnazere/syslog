require('./setup');
const test   = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const app    = require('../src/server');
const { pool } = require('../src/config/database');

// Tests HTTP n'ayant pas besoin de la base de données
let server, base;
test.before(() => new Promise(resolve => {
  server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; resolve(); });
}));
test.after(async () => { server.close(); await pool.end(); });

test('une route d\'authentification répond sans contrôle de licence (401 sans jeton)', async () => {
  const res = await fetch(`${base}/api/auth/me`);
  assert.strictEqual(res.status, 401);
});

test('un jeton mal signé est refusé', async () => {
  const res = await fetch(`${base}/api/auth/me`, { headers: { Authorization: 'Bearer abc.def.ghi' } });
  assert.strictEqual(res.status, 401);
});

test('la validation du login renvoie 422', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'pas-un-email' }),
  });
  assert.strictEqual(res.status, 422);
});

test('un JSON invalide renvoie 400', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.strictEqual(res.status, 400);
});

test('webhook WhatsApp : vérification par jeton', async () => {
  const ok = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=42`);
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(await ok.text(), '42');
  const ko = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=faux&hub.challenge=42`);
  assert.strictEqual(ko.status, 403);
});

test('webhook WhatsApp : signature Meta obligatoire', async () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
  const unsigned = await fetch(`${base}/webhooks/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.strictEqual(unsigned.status, 401);

  const signature = 'sha256=' + crypto.createHmac('sha256', 'app-secret-test').update(body).digest('hex');
  const signed = await fetch(`${base}/webhooks/whatsapp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature }, body,
  });
  assert.strictEqual(signed.status, 200);
});

test('route inconnue hors /api : 404', async () => {
  const res = await fetch(`${base}/inexistant`);
  assert.strictEqual(res.status, 404);
});

test('en-têtes de sécurité de l\'API, dont Permissions-Policy', async () => {
  const res = await fetch(`${base}/health`);
  assert.match(res.headers.get('permissions-policy') || '', /camera=\(\)/);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('content-security-policy'));
  assert.strictEqual(res.headers.get('x-powered-by'), null);
});

test('webhook : challenge non numérique refusé, réponse en texte brut', async () => {
  const xss = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=${encodeURIComponent('<script>alert(1)</script>')}`);
  assert.strictEqual(xss.status, 403);
  const ok = await fetch(`${base}/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify-test&hub.challenge=123456`);
  assert.strictEqual(ok.status, 200);
  assert.match(ok.headers.get('content-type'), /^text\/plain/);
});

test('anti-CSRF : modification depuis une origine étrangère refusée', async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attaquant.example' },
    body: JSON.stringify({ email: 'a@b.ci', password: 'x' }),
  });
  assert.strictEqual(res.status, 403);
  const site = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'cross-site' },
    body: JSON.stringify({ email: 'a@b.ci', password: 'x' }),
  });
  assert.strictEqual(site.status, 403);
});

test('CORS : aucune autorisation pour une origine étrangère, autorisation pour l\'application', async () => {
  const foreign = await fetch(`${base}/health`, { headers: { Origin: 'https://attaquant.example' } });
  assert.strictEqual(foreign.headers.get('access-control-allow-origin'), null);
  const own = await fetch(`${base}/health`, { headers: { Origin: 'http://localhost:5173' } });
  assert.strictEqual(own.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});
