require('./setup');
const test   = require('node:test');
const assert = require('node:assert');

const { redact, MASK }        = require('../src/utils/redact');
const { normalizePhone, formatDate, maskPhone } = require('../src/services/whatsapp.service');
const { isExempt }            = require('../src/middlewares/license.middleware');
const { generateKey, validateKeyFormat, maskKey } = require('../src/utils/licenseKey');
const { fromPgError, HttpError } = require('../src/utils/httpError');
const { hasRole } = require('../src/middlewares/auth.middleware');

test('redact masque les champs sensibles, y compris imbriqués', () => {
  const out = redact({ nom: 'Kouassi', password: 'x', data: { newPassword: 'y', cle: 'SL-1' }, list: [{ token: 't' }] });
  assert.strictEqual(out.nom, 'Kouassi');
  assert.strictEqual(out.password, MASK);
  assert.strictEqual(out.data.newPassword, MASK);
  assert.strictEqual(out.data.cle, MASK);
  assert.strictEqual(out.list[0].token, MASK);
  assert.strictEqual(redact({ numero_secu: '123' }).numero_secu, MASK);
});

test('normalizePhone accepte les numéros ivoiriens à 10 chiffres', () => {
  for (const input of ['0700000000', '07 00 00 00 00', '07-00-00-00-00', '+225 07 00 00 00 00', '002250700000000', '2250700000000']) {
    assert.strictEqual(normalizePhone(input), '2250700000000', input);
  }
});

test('normalizePhone rejette les formats invalides', () => {
  for (const input of ['', null, '07000000', '22507000000', '+33612345678', 'abc']) {
    assert.strictEqual(normalizePhone(input), null, String(input));
  }
});

test('formatDate gère les objets Date et les chaînes AAAA-MM-JJ', () => {
  assert.strictEqual(formatDate('2026-09-28', {}), '28/09/2026');
  assert.strictEqual(formatDate(new Date(2026, 8, 28), {}), '28/09/2026');
  assert.strictEqual(formatDate('pas une date', {}), '');
  assert.strictEqual(maskPhone('2250700000089'), '225070****89');
});

test('les routes d\'authentification et de licence sont exemptées du contrôle de licence', () => {
  assert.ok(isExempt('/api/auth/login'));
  assert.ok(isExempt('/api/auth/change-password'));
  assert.ok(isExempt('/api/license'));
  assert.ok(isExempt('/api/license/activate'));
  assert.ok(!isExempt('/api/requests'));
  assert.ok(!isExempt('/api/licenseX'));
});

test('clé de licence : signature vérifiée', () => {
  const key = generateKey();
  assert.match(key, /^SL-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/);
  assert.ok(validateKeyFormat(key));
  assert.ok(validateKeyFormat(key.toLowerCase()));
  const forged = key.slice(0, -1) + (key.endsWith('0') ? '1' : '0');
  assert.ok(!validateKeyFormat(forged));
  assert.ok(!maskKey(key).includes(key.split('-')[2]));
});

test('les erreurs PostgreSQL connues deviennent des erreurs HTTP', () => {
  assert.strictEqual(fromPgError({ code: 'P0001', message: 'Règle' }).status, 409);
  assert.strictEqual(fromPgError({ code: '23503' }).status, 409);
  assert.strictEqual(fromPgError({ code: '22P02' }).status, 422);
  assert.strictEqual(fromPgError({ code: 'XX000' }), null);
  assert.ok(new HttpError(400, 'x').expose);
});

test("le super-administrateur hérite des droits administrateur, pas l'inverse", () => {
  assert.ok(hasRole('superadmin', ['admin']));
  assert.ok(hasRole('superadmin', ['superadmin']));
  assert.ok(!hasRole('admin', ['superadmin']));
  assert.ok(!hasRole('manager', ['admin']));
  assert.ok(hasRole('manager', ['admin', 'manager']));
});

test('mots de passe : hachages existants ($2a$, $2y$) et vérifications simultanées', async () => {
  const { hashPassword, verifyPassword } = require('../src/utils/password');
  const hash = await hashPassword('Secret2026abc');
  assert.match(hash, /^\$2[ab]\$12\$/);
  assert.ok(await verifyPassword('Secret2026abc', hash.replace(/^\$2[ab]\$/, '$2y$')));
  const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
    verifyPassword(i % 2 ? 'Secret2026abc' : 'mauvais', hash)));
  assert.deepStrictEqual(results, results.map((_, i) => i % 2 === 1));
});
