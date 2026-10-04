const { query, withTransaction } = require('../config/database');
const { generateKey, validateKeyFormat, maskKey } = require('../utils/licenseKey');
const { clearSessionCache } = require('../middlewares/auth.middleware');

// ── Cache en mémoire (évite une requête DB à chaque appel API) ──
let _cache     = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000;

const getLicenseFromDB = async () => {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  // Licence active en priorité, sinon la plus récente
  const r = await query(`
    SELECT *, (date_expiration < CURRENT_DATE) AS is_expired,
           (date_expiration - CURRENT_DATE)    AS jours_restants
    FROM licences
    ORDER BY (statut = 'active') DESC, created_at DESC
    LIMIT 1
  `);
  _cache     = r.rows[0] || null;
  _cacheTime = now;
  return _cache;
};

const invalidateCache = () => { _cache = null; _cacheTime = 0; };

const getUsageStats = async () => {
  const [users, sessions] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM users WHERE is_active = true AND role != 'superadmin'`),
    query(`SELECT COUNT(DISTINCT user_id) AS total FROM sessions_actives WHERE expires_at > NOW()`),
  ]);
  return {
    utilisateurs_actifs: parseInt(users.rows[0].total, 10),
    connexions_actives:  parseInt(sessions.rows[0].total, 10),
  };
};

/** GET /api/license — Info licence + stats (admin) */
const getInfo = async (req, res, next) => {
  try {
    const licence = await getLicenseFromDB();
    const stats   = await getUsageStats();

    if (!licence) {
      return res.json({ data: null, stats, status: 'none', message: 'Aucune licence enregistrée.' });
    }

    const isExpired = licence.is_expired || licence.statut === 'expiree';
    const { cle, ...rest } = licence; // la clé brute n'est jamais renvoyée
    res.json({
      data: {
        ...rest,
        cle_masquee:    maskKey(cle),
        jours_restants: parseInt(licence.jours_restants, 10) || 0,
        is_expired:     isExpired,
      },
      stats,
      status: isExpired ? 'expired' : licence.statut,
    });
  } catch (err) { next(err); }
};

/** POST /api/license/generate — Génère une nouvelle clé */
const generate = async (req, res, next) => {
  try {
    const {
      organisation, contact,
      max_utilisateurs = 500, max_connexions = 500,
      date_expiration, modules = 'all', notes,
    } = req.body;

    const expDate = new Date(date_expiration);
    if (isNaN(expDate.getTime()) || expDate <= new Date())
      return res.status(400).json({ error: 'La date d\'expiration doit être dans le futur.' });

    const cle = generateKey();

    // La nouvelle licence n'est active d'emblée que s'il n'y en a aucune autre active
    const r = await query(`
      INSERT INTO licences
        (cle, organisation, contact, max_utilisateurs, max_connexions,
         date_expiration, modules, notes, cree_par, statut)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
              CASE WHEN EXISTS (SELECT 1 FROM licences WHERE statut = 'active') THEN 'suspendue' ELSE 'active' END)
      RETURNING id, organisation, max_utilisateurs, max_connexions, date_expiration, statut, created_at
    `, [cle, organisation, contact || null, max_utilisateurs, max_connexions,
        date_expiration, modules, notes || null, req.user.email]);

    invalidateCache();

    const created = r.rows[0];
    res.status(201).json({
      data:    { ...created, cle }, // clé complète uniquement à la génération
      message: created.statut === 'active'
        ? `Licence générée et activée pour ${organisation}.`
        : `Licence générée pour ${organisation}. Activez-la avec sa clé pour remplacer la licence actuelle.`,
    });
  } catch (err) { next(err); }
};

/** POST /api/license/activate — Active une clé existante */
const activate = async (req, res, next) => {
  try {
    const cle = String(req.body.cle || '').trim().toUpperCase();
    if (!validateKeyFormat(cle))
      return res.status(400).json({ error: 'Clé de licence invalide ou corrompue.', code: 'INVALID_KEY_FORMAT' });

    const r = await query(
      `SELECT *, (date_expiration < CURRENT_DATE) AS is_expired FROM licences WHERE cle = $1`, [cle]
    );
    const licence = r.rows[0];
    if (!licence)
      return res.status(404).json({ error: 'Clé de licence introuvable.', code: 'KEY_NOT_FOUND' });
    if (licence.is_expired)
      return res.status(400).json({ error: 'Cette clé de licence est expirée.', code: 'EXPIRED' });

    await withTransaction(async (client) => {
      await client.query(`UPDATE licences SET statut = 'suspendue' WHERE statut = 'active' AND id != $1`, [licence.id]);
      await client.query(`UPDATE licences SET statut = 'active' WHERE id = $1`, [licence.id]);
    });
    invalidateCache();

    res.json({
      data:    { ...licence, statut: 'active', cle: maskKey(licence.cle) },
      message: `Licence activée pour ${licence.organisation}.`,
    });
  } catch (err) { next(err); }
};

/** PATCH /api/license/:id/status — Suspendre / réactiver */
const toggleStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    const r = await withTransaction(async (client) => {
      if (statut === 'active') {
        await client.query(`UPDATE licences SET statut = 'suspendue' WHERE statut = 'active' AND id != $1`, [req.params.id]);
      }
      return client.query(
        `UPDATE licences SET statut = $1 WHERE id = $2 RETURNING id, organisation, statut`,
        [statut, req.params.id]
      );
    });
    if (!r.rows[0]) return res.status(404).json({ error: 'Licence introuvable.' });

    invalidateCache();
    res.json({ data: r.rows[0], message: `Licence ${statut === 'active' ? 'réactivée' : 'suspendue'}.` });
  } catch (err) { next(err); }
};

/** GET /api/license/sessions — Sessions actives détaillées */
const getSessions = async (req, res, next) => {
  try {
    const r = await query(`
      SELECT s.id, s.ip_address, s.last_seen, s.expires_at,
             u.prenom, u.nom, u.email, u.role
      FROM sessions_actives s
      JOIN users u ON u.id = s.user_id
      WHERE s.expires_at > NOW()
      ORDER BY s.last_seen DESC
    `);
    res.json({ data: r.rows, total: r.rowCount });
  } catch (err) { next(err); }
};

/** DELETE /api/license/sessions/:id — Terminer une session (le jeton devient invalide) */
const killSession = async (req, res, next) => {
  try {
    const r = await query(`DELETE FROM sessions_actives WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Session introuvable.' });
    clearSessionCache();
    res.json({ message: 'Session terminée.' });
  } catch (err) { next(err); }
};

module.exports = {
  getInfo, generate, activate, toggleStatus,
  getSessions, killSession,
  getLicenseFromDB, getUsageStats, invalidateCache,
};
