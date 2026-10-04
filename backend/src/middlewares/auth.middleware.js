const crypto = require('crypto');
const jwt    = require('jsonwebtoken');
const { jwtSecret, isProduction } = require('../config/env');
const { query }     = require('../config/database');

// Cookie de session : HttpOnly (illisible par JavaScript), SameSite=Strict, Secure en production
const SESSION_COOKIE = 'sl_session';
const sessionCookieOptions = (maxAgeMs) => ({
  httpOnly: true,
  sameSite: 'strict',
  secure:   isProduction,
  path:     '/',
  ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// ── Cache court des sessions valides (évite une requête SQL par appel) ──
const CACHE_TTL = 30_000;
const LAST_SEEN_INTERVAL = 60_000;
const sessionCache = new Map(); // token_hash → { user, checkedAt, lastSeenAt }

const clearSessionCache = () => sessionCache.clear();

const loadSession = async (tokenHash) => {
  const cached = sessionCache.get(tokenHash);
  const now = Date.now();
  if (cached && now - cached.checkedAt < CACHE_TTL) return cached;

  const r = await query(
    `SELECT u.id, u.email, u.role, u.nom, u.prenom, u.is_active, u.must_change_password, u.employee_id
     FROM sessions_actives s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [tokenHash]
  );
  const row = r.rows[0];
  if (!row || !row.is_active) {
    sessionCache.delete(tokenHash);
    return null;
  }
  const entry = { user: row, checkedAt: now, lastSeenAt: cached?.lastSeenAt || 0 };
  if (sessionCache.size > 5000) sessionCache.clear();
  sessionCache.set(tokenHash, entry);
  return entry;
};

// Routes accessibles alors qu'un changement de mot de passe est exigé
const PASSWORD_CHANGE_ALLOWED = ['/api/auth/me', '/api/auth/change-password', '/api/auth/logout'];

/**
 * Vérifie le JWT **et** l'existence de la session côté serveur.
 * Une session supprimée (déconnexion, désactivation, réinitialisation,
 * « terminer la session ») invalide immédiatement le jeton.
 * Le rôle est lu en base : un changement de rôle s'applique sans reconnexion.
 */
const authenticate = async (req, res, next) => {
  // Navigateur : cookie HttpOnly. Clients non navigateur (scripts, tests) : en-tête Authorization.
  const authHeader = req.headers.authorization;
  const token = req.cookies?.[SESSION_COOKIE]
    || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  if (!token) {
    return res.status(401).json({ error: 'Token manquant ou invalide.' });
  }
  try {
    jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Token expiré ou invalide.' });
  }

  try {
    const tokenHash = hashToken(token);
    const session = await loadSession(tokenHash);
    if (!session) return res.status(401).json({ error: 'Session expirée ou révoquée.' });

    const u = session.user;
    req.user = {
      id: u.id, email: u.email, role: u.role, nom: u.nom, prenom: u.prenom,
      name: `${u.prenom} ${u.nom}`, employee_id: u.employee_id,
      must_change_password: u.must_change_password,
    };
    req.tokenHash = tokenHash;

    if (u.must_change_password && !PASSWORD_CHANGE_ALLOWED.includes(req.baseUrl + req.path)) {
      return res.status(403).json({
        error: 'Vous devez changer votre mot de passe avant de continuer.',
        code:  'PASSWORD_CHANGE_REQUIRED',
      });
    }

    if (Date.now() - session.lastSeenAt > LAST_SEEN_INTERVAL) {
      session.lastSeenAt = Date.now();
      query('UPDATE sessions_actives SET last_seen = NOW() WHERE token_hash = $1', [tokenHash])
        .catch(() => {});
    }
    next();
  } catch (err) { next(err); }
};

/** Le super-administrateur dispose de tous les droits d'un administrateur. */
const hasRole = (role, roles) => roles.includes(role) || (role === 'superadmin' && roles.includes('admin'));

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés.
 * Usage : authorize('admin', 'manager') — authorize('superadmin') pour les actions réservées.
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !hasRole(req.user.role, roles)) {
    return res.status(403).json({ error: 'Accès refusé.' });
  }
  next();
};

module.exports = { authenticate, authorize, hasRole, hashToken, clearSessionCache, SESSION_COOKIE, sessionCookieOptions };
