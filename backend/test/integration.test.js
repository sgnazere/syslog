/**
 * Tests d'intégration de bout en bout (API + PostgreSQL).
 * Exécutés uniquement si INTEGRATION=1 (base migrée requise) :
 *   INTEGRATION=1 npm test
 * Toutes les données créées sont supprimées à la fin.
 */
require('dotenv').config();
require('./setup');
const test   = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcryptjs');

const enabled = process.env.INTEGRATION === '1';

test('scénario complet : demande multi-destinations, affectation, clôture, contrôles d\'accès', { skip: !enabled && 'INTEGRATION=1 non défini' }, async (t) => {
  const app = require('../src/server');
  const { pool } = require('../src/config/database');
  const { invalidateCache } = require('../src/controllers/license.controller');

  const server = await new Promise(resolve => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (method, path, token, body) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch { /* corps vide */ }
    return { status: res.status, data };
  };
  const futureDate = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const ids = { users: [], employees: [], vehicles: [], drivers: [], demandes: [], licence: null };

  try {
    // Licence active nécessaire (base de CI vide)
    if (!(await pool.query(`SELECT 1 FROM licences WHERE statut = 'active'`)).rowCount) {
      const l = await pool.query(
        `INSERT INTO licences (cle, organisation, date_expiration, max_connexions)
         VALUES ('SL-TEST', 'Tests', CURRENT_DATE + 30, 50) RETURNING id`);
      ids.licence = l.rows[0].id;
      invalidateCache();
    }

    const hash = await bcrypt.hash('Provisoire2026x', 12);
    const a = await pool.query(
      `INSERT INTO users (nom, prenom, email, password, role, must_change_password)
       VALUES ('Test', 'Admin', 'integration.admin@syslog.test', $1, 'admin', true) RETURNING id`, [hash]);
    ids.users.push(a.rows[0].id);
    const communes = (await pool.query('SELECT id FROM communes ORDER BY id LIMIT 3')).rows.map(r => r.id);

    let r;
    let admin;
    await t.test('authentification et changement de mot de passe obligatoire', async () => {
      r = await call('POST', '/auth/login', null, { email: 'integration.admin@syslog.test', password: 'faux' });
      assert.strictEqual(r.status, 401);
      r = await call('POST', '/auth/login', null, { email: 'Integration.Admin@syslog.test', password: 'Provisoire2026x' });
      assert.strictEqual(r.status, 200);
      admin = r.data.token;
      assert.strictEqual((await call('GET', '/requests', admin)).data.code, 'PASSWORD_CHANGE_REQUIRED');
      assert.strictEqual((await call('PUT', '/auth/change-password', admin, { currentPassword: 'Provisoire2026x', newPassword: 'court' })).status, 422);
      assert.strictEqual((await call('PUT', '/auth/change-password', admin, { currentPassword: 'Provisoire2026x', newPassword: 'NouveauMotDePasse2026' })).status, 200);
    });

    await t.test('réservé au super-administrateur : licences et comptes super-administrateur', async () => {
      r = await call('POST', '/license/generate', admin, { organisation: 'X', date_expiration: futureDate(30) });
      assert.strictEqual(r.status, 403);
      r = await call('POST', '/users', admin, { nom: 'X', prenom: 'Y', email: 'integration.super@syslog.test', role: 'superadmin', password: 'Provisoire2026z' });
      assert.strictEqual(r.status, 403);
      assert.strictEqual((await call('GET', '/license', admin)).status, 200);
    });

    const emp1 = (await call('POST', '/employees', admin, { nom: 'Test', prenoms: 'Initiateur', status: 'actif' })).data.data.id;
    const emp2 = (await call('POST', '/employees', admin, { nom: 'Test', prenoms: 'Passager', status: 'actif' })).data.data.id;
    ids.employees.push(emp1, emp2);
    const veh = (await call('POST', '/vehicles', admin, { immatriculation: 'TEST-INT-1', marque: 'T', modele: 'X', type_vehicule: 'SUV', capacite: 4, kilometrage: 1000 })).data.data.id;
    ids.vehicles.push(veh);
    const drv = (await call('POST', '/drivers', admin, { nom: 'Test', prenoms: 'Chauffeur', numero_permis: 'P1', type_permis: 'B', date_expiration_permis: futureDate(365) })).data.data.id;
    const drvExpire = (await call('POST', '/drivers', admin, { nom: 'Test', prenoms: 'Expire', numero_permis: 'P2', type_permis: 'B', date_expiration_permis: futureDate(1) })).data.data.id;
    ids.drivers.push(drv, drvExpire);

    r = await call('POST', '/users', admin, { employee_id: emp2, email: 'integration.user@syslog.test', role: 'user', password: 'Provisoire2026y' });
    assert.strictEqual(r.status, 201);
    ids.users.push(r.data.data.id);
    const userId = r.data.data.id;

    await t.test('le journal d\'audit ne contient pas le mot de passe', async () => {
      await wait(300);
      const audit = await pool.query(`SELECT details FROM audit_logs WHERE action = 'CREATE_USER' AND entity_id = $1`, [String(userId)]);
      assert.strictEqual(audit.rowCount, 1);
      assert.ok(!audit.rows[0].details.includes('Provisoire2026y'));
    });

    const date = futureDate(10);
    let dem;
    await t.test('une demande porte plusieurs destinations', async () => {
      r = await call('POST', '/requests', admin, { employe_id: emp1, commune_ids: communes, date_deplacement: date, heure_depart: '08:00', heure_retour: '17:00', objectif: 'Intégration', passager_ids: [emp2] });
      assert.strictEqual(r.status, 201);
      dem = r.data.data.id;
      ids.demandes.push(dem);
      r = await call('GET', `/requests/${dem}`, admin);
      assert.strictEqual(r.data.data.communes.length, communes.length);
      assert.strictEqual(r.data.data.date_deplacement, date);
      r = await call('POST', '/requests', admin, { employe_id: emp1, commune_ids: [communes[0]], date_deplacement: date, heure_depart: '08:00', heure_retour: '17:00', objectif: 'Doublon' });
      assert.strictEqual(r.status, 409);
    });

    await t.test('validation : permis expiré refusé, validations concurrentes sérialisées', async () => {
      assert.strictEqual((await call('PATCH', `/requests/${dem}/validate`, admin, { vehicule_id: veh, chauffeur_id: drvExpire })).status, 409);
      const both = await Promise.all([
        call('PATCH', `/requests/${dem}/validate`, admin, { vehicule_id: veh, chauffeur_id: drv }),
        call('PATCH', `/requests/${dem}/validate`, admin, { vehicule_id: veh, chauffeur_id: drv }),
      ]);
      assert.deepStrictEqual(both.map(x => x.status).sort(), [200, 409]);
      assert.strictEqual((await call('POST', '/maintenance', admin, { vehicule_id: veh, type_maintenance: 'Vidange', date_debut: date })).status, 409);
    });

    await t.test('clôture : compteur cohérent, véhicule libéré', async () => {
      assert.strictEqual((await call('PATCH', `/requests/${dem}/complete`, admin, { km_depart: 900, km_retour: 950 })).status, 422);
      r = await call('PATCH', `/requests/${dem}/complete`, admin, { km_depart: 1000, km_retour: 1120 });
      assert.strictEqual(r.data.distance, 120);
      const v = (await pool.query('SELECT statut, kilometrage FROM vehicules WHERE id = $1', [veh])).rows[0];
      assert.deepStrictEqual([v.statut, v.kilometrage], ['disponible', 1120]);
      assert.strictEqual((await call('PATCH', `/requests/${dem}/reject`, admin, { reason: 'x' })).status, 409);
      await wait(500);
      const n = await pool.query('SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND request_id = $2', [userId, dem]);
      assert.strictEqual(n.rows[0].n, 2);
    });

    await t.test('utilisateur simple : accès limité à ses demandes', async () => {
      r = await call('POST', '/auth/login', null, { email: 'integration.user@syslog.test', password: 'Provisoire2026y' });
      const user = r.data.token;
      await call('PUT', '/auth/change-password', user, { currentPassword: 'Provisoire2026y', newPassword: 'UtilisateurTest2026' });
      r = await call('GET', '/requests', user);
      assert.ok(r.data.data.every(d => d.employe_id === emp2 || d.passagers.some(p => p.id === emp2)));
      assert.strictEqual((await call('GET', '/employees', user)).status, 403);
      r = await call('POST', '/requests', user, { employe_id: emp1, commune_ids: [communes[0]], date_deplacement: futureDate(12), heure_depart: '08:00', heure_retour: '12:00', objectif: 'Pour moi' });
      assert.strictEqual(r.status, 201);
      ids.demandes.push(r.data.data.id);
      assert.strictEqual((await pool.query('SELECT employe_id FROM demande_deplacement WHERE id = $1', [r.data.data.id])).rows[0].employe_id, emp2);

      // Révocation immédiate à la désactivation du compte
      assert.strictEqual((await call('PATCH', `/users/${userId}/toggle-active`, admin)).status, 200);
      assert.strictEqual((await call('GET', '/requests', user)).status, 401);
    });

    await t.test('la déconnexion révoque le jeton', async () => {
      await call('POST', '/auth/logout', admin);
      assert.strictEqual((await call('GET', '/license', admin)).status, 401);
    });
  } finally {
    await pool.query('DELETE FROM audit_logs WHERE user_id = ANY($1::int[])', [ids.users]);
    await pool.query('DELETE FROM notifications WHERE request_id = ANY($1::int[]) OR user_id = ANY($2::int[])', [ids.demandes, ids.users]);
    await pool.query('DELETE FROM demande_deplacement WHERE id = ANY($1::int[])', [ids.demandes]);
    await pool.query('DELETE FROM chauffeurs WHERE id = ANY($1::int[])', [ids.drivers]);
    await pool.query('DELETE FROM vehicules WHERE id = ANY($1::int[])', [ids.vehicles]);
    await pool.query('DELETE FROM users WHERE id = ANY($1::int[])', [ids.users]);
    await pool.query('DELETE FROM employees WHERE id = ANY($1::int[])', [ids.employees]);
    if (ids.licence) await pool.query('DELETE FROM licences WHERE id = $1', [ids.licence]);
    server.close();
    await pool.end();
  }
});
