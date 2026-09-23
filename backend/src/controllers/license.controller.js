const crypto                               = require('crypto');
const { query }                            = require('../config/database');
const { generateKey, validateKeyFormat, maskKey } = require('../utils/licenseKey');

// ── Cache en mémoire (évite une requête DB à chaque appel API) ──
let _cache     = null;
let _cacheTime = 0;
const CACHE_TTL = 60_000; // 60 secondes

const getLicenseFromDB = async () => {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  const r = await query(`
    SELECT *, (date_expiration < CURRENT_DATE) AS is_expired,
           (date_expiration - CURRENT_DATE)    AS jours_restants
    FROM licences
    ORDER BY created_at DESC
    LIMIT 1
  `);
  _cache     = r.rows[0] || null;
  _cacheTime = now;
  return _cache;
};

const invalidateCache = () => { _cache = null; _cacheTime = 0; };

// ── Statistiques d'utilisation ────────────────────────────────
const getUsageStats = async () => {
  const [users, sessions] = await Promise.all([
    query(`SELECT COUNT(*) AS total FROM users WHERE is_active = true`),
    query(`SELECT COUNT(*) AS total FROM sessions_actives WHERE expires_at > NOW()`),
  ]);
  return {
    utilisateurs_actifs:   parseInt(users.rows[0].total),
    connexions_actives:    parseInt(sessions.rows[0].total),
  };
};

/** GET /api/license — Info licence + stats (admin) */
const getInfo = async (req, res, next) => {
  try {
    const licence = await getLicenseFromDB();
    const stats   = await getUsageStats();

    if (!licence) {
      return res.json({
        data:   null,
        stats,
        status: 'none',
        message: 'Aucune licence enregistrée.',
      });
    }

    const joursRestants = parseInt(licence.jours_restants) || 0;
    const isExpired     = licence.is_expired || licence.statut === 'expiree';

    res.json({
      data: {
        ...licence,
        cle_masquee:    maskKey(licence.cle),
        jours_restants: joursRestants,
        is_expired:     isExpired,
        // Ne jamais renvoyer la clé brute au client
        cle:            undefined,
      },
      stats,
      status: isExpired ? 'expired' : licence.statut,
    });
  } catch (err) { next(err); }
};

/** POST /api/license/generate — Génère une nouvelle clé (super-admin) */
const generate = async (req, res, next) => {
  try {
    const {
      organisation, contact,
      max_utilisateurs = 10, max_connexions = 5,
      date_expiration, modules = 'all', notes, cree_par,
    } = req.body;

    if (!organisation || !date_expiration)
      return res.status(400).json({ error: 'Organisation et date d\'expiration requises.' });

    const expDate = new Date(date_expiration);
    if (isNaN(expDate.getTime()) || expDate <= new Date())
      return res.status(400).json({ error: 'La date d\'expiration doit être dans le futur.' });

    const cle = generateKey();

    const r = await query(`
      INSERT INTO licences
        (cle, organisation, contact, max_utilisateurs, max_connexions,
         date_expiration, modules, notes, cree_par)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING id, organisation, max_utilisateurs, max_connexions, date_expiration, statut, created_at
    `, [cle, organisation, contact || null, max_utilisateurs, max_connexions,
        date_expiration, modules, notes || null, cree_par || req.user?.email || 'system']);

    invalidateCache();

    res.status(201).json({
      data:    { ...r.rows[0], cle },   // clé complète uniquement à la génération
      message: `Licence générée pour ${organisation}.`,
    });
  } catch (err) { next(err); }
};

/** POST /api/license/activate — Active une clé existante (admin) */
const activate = async (req, res, next) => {
  try {
    const { cle } = req.body;
    if (!cle) return res.status(400).json({ error: 'Clé de licence requise.' });

    // Valider le format cryptographique
    if (!validateKeyFormat(cle))
      return res.status(400).json({ error: 'Clé de licence invalide ou corrompue.', code: 'INVALID_KEY_FORMAT' });

    // Vérifier que la clé existe en base
    const r = await query(`
      SELECT *, (date_expiration < CURRENT_DATE) AS is_expired
      FROM licences WHERE cle = $1
    `, [cle.trim().toUpperCase()]);

    if (!r.rows[0])
      return res.status(404).json({ error: 'Clé de licence introuvable.', code: 'KEY_NOT_FOUND' });

    const licence = r.rows[0];

    if (licence.is_expired)
      return res.status(400).json({ error: 'Cette clé de licence est expirée.', code: 'EXPIRED' });

    // Activer : mettre toutes les autres en "suspendue" et celle-ci en "active"
    await query(`UPDATE licences SET statut = 'suspendue' WHERE statut = 'active' AND cle != $1`, [licence.cle]);
    await query(`UPDATE licences SET statut = 'active' WHERE id = $1`, [licence.id]);

    invalidateCache();

    res.json({
      data:    { ...licence, cle: maskKey(licence.cle) },
      message: `Licence activée pour ${licence.organisation}.`,
    });
  } catch (err) { next(err); }
};

/** PATCH /api/license/:id/suspend — Suspendre / réactiver */
const toggleStatus = async (req, res, next) => {
  try {
    const { statut } = req.body;
    if (!['active', 'suspendue'].includes(statut))
      return res.status(400).json({ error: 'Statut invalide.' });

    const r = await query(
      `UPDATE licences SET statut = $1 WHERE id = $2 RETURNING id, organisation, statut`,
      [statut, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Licence introuvable.' });

    invalidateCache();
    res.json({ data: r.rows[0], message: `Licence ${statut === 'active' ? 'réactivée' : 'suspendue'}.` });
  } catch (err) { next(err); }
};

/** GET /api/license/sessions — Sessions actives détaillées (admin) */
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

/** DELETE /api/license/sessions/:id — Terminer une session */
const killSession = async (req, res, next) => {
  try {
    await query(`DELETE FROM sessions_actives WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Session terminée.' });
  } catch (err) { next(err); }
};

module.exports = {
  getInfo, generate, activate, toggleStatus,
  getSessions, killSession,
  getLicenseFromDB, getUsageStats, invalidateCache,
};
