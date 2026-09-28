const { hashPassword, verifyPassword } = require('../utils/password');
const jwt    = require('jsonwebtoken');
const { query, withTransaction } = require('../config/database');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { hashToken, clearSessionCache } = require('../middlewares/auth.middleware');
const { getLicenseFromDB } = require('./license.controller');

// Nombre maximal de sessions ouvertes par un même utilisateur (les plus anciennes sont fermées)
const MAX_SESSIONS_PER_USER = 3;

// Empreinte factice : bcrypt est exécuté même pour un e-mail inconnu (temps de réponse homogène)
const DUMMY_HASH = require('bcrypt').hashSync('syslog-compte-inexistant', 12);

const publicUser = (u) => ({
  id:                   u.id,
  nom:                  u.nom,
  prenom:               u.prenom,
  name:                 `${u.prenom} ${u.nom}`,
  email:                u.email,
  role:                 u.role,
  employee_id:          u.employee_id,
  must_change_password: u.must_change_password,
});

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, nom, prenom, email, password, role, is_active, employee_id, must_change_password
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    const user = result.rows[0];

    const valid = await verifyPassword(password, user?.password || DUMMY_HASH);
    if (!user || !user.is_active || !valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // ── Limite de connexions simultanées de la licence (les administrateurs ne sont jamais bloqués) ──
    await query(`DELETE FROM sessions_actives WHERE expires_at <= NOW()`);
    const licence = await getLicenseFromDB();
    if (licence && licence.statut === 'active' && !['admin', 'superadmin'].includes(user.role)) {
      const count = await query(
        `SELECT COUNT(DISTINCT user_id) AS n FROM sessions_actives WHERE user_id != $1`, [user.id]
      );
      const connectes = parseInt(count.rows[0].n, 10);
      if (connectes >= licence.max_connexions) {
        return res.status(403).json({
          error: `Nombre maximum d'utilisateurs connectés simultanément atteint (${licence.max_connexions}). Veuillez réessayer plus tard.`,
          code:  'MAX_CONNECTIONS_REACHED',
          max_connexions: licence.max_connexions,
          connexions_actives: connectes,
        });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: jwtExpiresIn });
    const { exp } = jwt.decode(token);

    await withTransaction(async (client) => {
      await client.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);
      await client.query(
        `INSERT INTO sessions_actives (user_id, token_hash, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, to_timestamp($5))`,
        [user.id, hashToken(token), req.ip, (req.headers['user-agent'] || '').slice(0, 500) || null, exp]
      );
      // Ne conserver que les sessions les plus récentes de cet utilisateur
      await client.query(
        `DELETE FROM sessions_actives
         WHERE user_id = $1 AND id NOT IN (
           SELECT id FROM sessions_actives WHERE user_id = $1 ORDER BY id DESC LIMIT $2)`,
        [user.id, MAX_SESSIONS_PER_USER]
      );
    });
    clearSessionCache();

    res.json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
};

/** POST /api/auth/logout — ferme la session courante */
const logout = async (req, res, next) => {
  try {
    await query(`DELETE FROM sessions_actives WHERE token_hash = $1`, [req.tokenHash]);
    clearSessionCache();
    res.json({ message: 'Déconnecté.' });
  } catch (err) { next(err); }
};

/** GET /api/auth/me */
const me = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nom, prenom, email, role, is_active, employee_id, must_change_password,
              date_creation, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const u = result.rows[0];
    res.json({ data: { ...publicUser(u), is_active: u.is_active, date_creation: u.date_creation, last_login: u.last_login } });
  } catch (err) { next(err); }
};

/** PUT /api/auth/change-password — ferme toutes les autres sessions */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    if (!(await verifyPassword(currentPassword, user.password)))
      return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    if (currentPassword === newPassword)
      return res.status(422).json({ error: 'Le nouveau mot de passe doit être différent de l\'actuel.' });

    const hash = await hashPassword(newPassword);
    await withTransaction(async (client) => {
      await client.query(
        'UPDATE users SET password = $1, must_change_password = false WHERE id = $2',
        [hash, req.user.id]
      );
      await client.query(
        'DELETE FROM sessions_actives WHERE user_id = $1 AND token_hash != $2',
        [req.user.id, req.tokenHash]
      );
    });
    clearSessionCache();
    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) { next(err); }
};

module.exports = { login, logout, me, changePassword, publicUser };
