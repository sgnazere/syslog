require('dotenv').config();
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../config/database');
const { getLicenseFromDB } = require('./license.controller');

/**
 * POST /api/auth/login
 * Authentification sur la table `users` (nom, prenom, email, password, role, is_active)
 * Roles DB : 'admin' | 'manager' | 'user'
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      `SELECT id, nom, prenom, email, password, role, is_active
       FROM users
       WHERE email = $1`,
      [email.toLowerCase().trim()]
    );

    const user = result.rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Compatible $2y$ (PHP) et $2b$ (Node) — bcryptjs gère les deux
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // ── Vérification de la licence et des connexions simultanées ──
    const licence = await getLicenseFromDB();
    if (licence && licence.statut === 'active') {
      // Nettoyer les sessions expirées
      await query(`DELETE FROM sessions_actives WHERE expires_at <= NOW()`);

      // Compter les connexions actives
      const sessionCount = await query(
        `SELECT COUNT(*) FROM sessions_actives WHERE expires_at > NOW()`
      );
      const nbActives = parseInt(sessionCount.rows[0].count);

      if (nbActives >= licence.max_connexions) {
        return res.status(403).json({
          error: `Nombre maximum de connexions simultanées atteint (${licence.max_connexions}). Veuillez réessayer plus tard.`,
          code:  'MAX_CONNECTIONS_REACHED',
          max_connexions: licence.max_connexions,
          connexions_actives: nbActives,
        });
      }
    }

    // Mettre à jour last_login
    await query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      {
        id:    user.id,
        email: user.email,
        role:  user.role,        // 'admin' | 'manager' | 'user'
        name:  `${user.prenom} ${user.nom}`,
        nom:   user.nom,
        prenom: user.prenom,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // ── Enregistrer la session active ────────────────────────────
    const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
    const expiresMs = expiresIn.endsWith('h')
      ? parseInt(expiresIn) * 3600 * 1000
      : 8 * 3600 * 1000;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await query(
      `INSERT INTO sessions_actives (user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '${parseInt(expiresIn) || 8} hours')
       ON CONFLICT (token_hash) DO NOTHING`,
      [user.id, tokenHash, req.ip, req.headers['user-agent'] || null]
    ).catch(() => {}); // non bloquant

    res.json({
      token,
      user: {
        id:     user.id,
        nom:    user.nom,
        prenom: user.prenom,
        name:   `${user.prenom} ${user.nom}`,
        email:  user.email,
        role:   user.role,
      },
    });
  } catch (err) { next(err); }
};

/**
 * GET /api/auth/me
 */
const me = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, nom, prenom, email, role, is_active, date_creation, last_login
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const u = result.rows[0];
    res.json({ data: { ...u, name: `${u.prenom} ${u.nom}` } });
  } catch (err) { next(err); }
};

/**
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password = $1, date_modification = CURRENT_TIMESTAMP WHERE id = $2',
      [hash, req.user.id]
    );
    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) { next(err); }
};

module.exports = { login, me, changePassword };
