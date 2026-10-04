/**
 * Modifie le rôle d'un compte existant (utile pour désigner le premier super-administrateur).
 * Les sessions du compte sont fermées pour que le nouveau rôle s'applique immédiatement.
 *
 * Usage : npm run set-role -- <email> <superadmin|admin|manager|user>
 */
const { pool } = require('../src/config/database');

const ROLES = ['superadmin', 'admin', 'manager', 'user'];

(async () => {
  const [email, role] = process.argv.slice(2);
  if (!email || !ROLES.includes(role)) {
    console.error(`Usage : npm run set-role -- <email> <${ROLES.join('|')}>`);
    process.exitCode = 1;
    return pool.end();
  }
  try {
    const r = await pool.query(
      `UPDATE users SET role = $2 WHERE LOWER(email) = LOWER($1) RETURNING id, prenom, nom, role`, [email, role]);
    if (!r.rows[0]) {
      console.error(`Aucun compte pour ${email}.`);
      process.exitCode = 1;
    } else {
      await pool.query('DELETE FROM sessions_actives WHERE user_id = $1', [r.rows[0].id]);
      const u = r.rows[0];
      console.log(`${u.prenom} ${u.nom} (${email}) → ${u.role}`);
    }
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
