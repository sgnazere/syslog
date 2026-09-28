/**
 * Réinitialise le mot de passe d'un compte depuis le serveur (accès perdu à tous les comptes admin).
 * Génère un mot de passe provisoire aléatoire, affiché une seule fois, à changer à la connexion.
 * Les sessions du compte sont fermées.
 *
 * Usage : npm run reset-password -- <email>
 */
const crypto = require('crypto');
const { hashPassword } = require('../src/utils/password');
const { pool } = require('../src/config/database');

(async () => {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error('Usage : npm run reset-password -- <email>');
    process.exitCode = 1;
    return pool.end();
  }
  try {
    // 16 caractères aléatoires + un chiffre garanti (politique de mot de passe)
    const password = crypto.randomBytes(12).toString('base64url') + '7';
    const hash = await hashPassword(password);
    const r = await pool.query(
      `UPDATE users SET password = $2, must_change_password = true, is_active = true
       WHERE LOWER(email) = LOWER($1) RETURNING id, prenom, nom, role`, [email, hash]);
    if (!r.rows[0]) {
      console.error(`Aucun compte pour ${email}.`);
      process.exitCode = 1;
    } else {
      await pool.query('DELETE FROM sessions_actives WHERE user_id = $1', [r.rows[0].id]);
      const u = r.rows[0];
      console.log(`${u.prenom} ${u.nom} (${u.role}) — mot de passe provisoire (affiché une seule fois) : ${password}`);
      console.log('Il devra être changé à la prochaine connexion.');
    }
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
