/**
 * Crée un compte administrateur avec un mot de passe provisoire aléatoire,
 * à changer obligatoirement à la première connexion.
 *
 * Usage : npm run create-admin -- <email> <Nom> <Prénom> [--superadmin]
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/database');

(async () => {
  const args = process.argv.slice(2);
  const role = args.includes('--superadmin') ? 'superadmin' : 'admin';
  const [email, nom, prenom] = args.filter(a => !a.startsWith('--'));
  if (!email || !nom || !prenom || !/^\S+@\S+\.\S+$/.test(email)) {
    console.error('Usage : npm run create-admin -- <email> <Nom> <Prénom> [--superadmin]');
    process.exitCode = 1;
    return pool.end();
  }
  try {
    // 16 caractères aléatoires + un chiffre garanti (politique de mot de passe)
    const password = crypto.randomBytes(12).toString('base64url') + '7';
    const hash = await bcrypt.hash(password, 12);
    const r = await pool.query(
      `INSERT INTO users (nom, prenom, email, password, role, must_change_password)
       VALUES ($1, $2, LOWER($3), $4, $5, true)
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [nom, prenom, email, hash, role]
    );
    if (!r.rows[0]) {
      console.error(`Un compte existe déjà pour ${email}.`);
      process.exitCode = 1;
    } else {
      console.log(`${role === 'superadmin' ? 'Super-administrateur' : 'Administrateur'} créé : ${email}`);
      console.log(`Mot de passe provisoire (affiché une seule fois) : ${password}`);
      console.log('Il devra être changé à la première connexion.');
    }
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
