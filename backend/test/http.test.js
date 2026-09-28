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
