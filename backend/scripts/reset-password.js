/**
 * Réinitialise le mot de passe d'un compte, ou de tous les comptes, depuis le serveur.
 * Génère un mot de passe provisoire aléatoire par compte, affiché une seule fois,
 * à changer obligatoirement à la prochaine connexion. Les sessions sont fermées.
 *
 * Usage : npm run reset-password -- <email>
 *         npm run reset-password -- --all
 */
const crypto = require('crypto');
const { hashPassword } = require('../src/utils/password');
const { pool } = require('../src/config/database');

// 16 caractères aléatoires + un chiffre garanti (politique de mot de passe)
const newPassword = () => crypto.randomBytes(12).toString('base64url') + '7';

(async () => {
  const [arg] = process.argv.slice(2);
  if (!arg) {
    console.error('Usage : npm run reset-password -- <email>   |   npm run reset-password -- --all');
    process.exitCode = 1;
    return pool.end();
  }
  try {
    const users = (await pool.query(
      arg === '--all'
        ? `SELECT id, email, prenom, nom, role FROM users ORDER BY role, email`
        : `SELECT id, email, prenom, nom, role FROM users WHERE LOWER(email) = LOWER($1)`,
      arg === '--all' ? [] : [arg]
    )).rows;
    if (!users.length) {
      console.error(`Aucun compte pour ${arg}.`);
      process.exitCode = 1;
      return;
    }

    const results = [];
    for (const u of users) {
      const password = newPassword();
      await pool.query(
        `UPDATE users SET password = $2, must_change_password = true, is_active = true WHERE id = $1`,
        [u.id, await hashPassword(password)]
      );
      await pool.query('DELETE FROM sessions_actives WHERE user_id = $1', [u.id]);
      results.push({ email: u.email, nom: `${u.prenom} ${u.nom}`, role: u.role, 'mot de passe provisoire': password });
    }
    console.table(results);
    console.log('Mots de passe affichés une seule fois : à transmettre à chaque personne, qui devra le changer à sa connexion.');
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
