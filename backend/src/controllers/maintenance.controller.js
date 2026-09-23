const { query } = require('../config/database');

const TYPES_MAINTENANCE = [
  'Vidange', 'Révision', 'Réparation', 'Contrôle technique',
  'Changement pneus', 'Batterie', 'Autre',
];

const fmt = (r) => r ? ({ ...r, types_disponibles: undefined }) : null;

/** GET /api/maintenance */
const getAll = async (req, res, next) => {
  try {
    const { vehicule_id, statut } = req.query;
    const params = [];
    let where = ' WHERE 1=1';

    if (vehicule_id) { params.push(vehicule_id); where += ` AND m.vehicule_id = $${params.length}`; }
    if (statut)      { params.push(statut);      where += ` AND m.statut = $${params.length}`; }

    const r = await query(`
      SELECT
        m.*,
        v.immatriculation, v.marque, v.modele, v.kilometrage AS km_actuel
      FROM maintenance_vehicules m
      JOIN vehicules v ON v.id = m.vehicule_id
      ${where}
      ORDER BY
        CASE m.statut WHEN 'en_cours' THEN 1 WHEN 'planifiee' THEN 2 ELSE 3 END,
        m.date_debut DESC
    `, params);

    res.json({ data: r.rows, total: r.rowCount });
  } catch (err) { next(err); }
};

/** POST /api/maintenance — Créer un dossier de maintenance */
const create = async (req, res, next) => {
  try {
    const {
      vehicule_id, type_maintenance, date_debut,
      date_fin, cout, description, statut = 'planifiee',
    } = req.body;

    if (!vehicule_id || !type_maintenance || !date_debut)
      return res.status(400).json({ error: 'Véhicule, type et date de début requis.' });

    // Mettre le véhicule en maintenance si le statut est planifiée ou en_cours
    if (statut !== 'terminee') {
      await query(
        `UPDATE vehicules SET statut = 'en_maintenance' WHERE id = $1`,
        [vehicule_id]
      );
    }

    const r = await query(`
      INSERT INTO maintenance_vehicules
        (vehicule_id, type_maintenance, date_debut, date_fin, cout, description, statut)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [vehicule_id, type_maintenance, date_debut, date_fin || null,
        cout || null, description || null, statut]);

    res.status(201).json({ data: r.rows[0], message: 'Dossier de maintenance créé.' });
  } catch (err) { next(err); }
};

/** PUT /api/maintenance/:id — Modifier */
const update = async (req, res, next) => {
  try {
    const {
      type_maintenance, date_debut, date_fin,
      cout, description, statut,
    } = req.body;

    const r = await query(`
      UPDATE maintenance_vehicules
      SET type_maintenance = $1, date_debut = $2, date_fin = $3,
          cout = $4, description = $5, statut = $6
      WHERE id = $7
      RETURNING *
    `, [type_maintenance, date_debut, date_fin || null,
        cout || null, description || null, statut, req.params.id]);

    if (!r.rows[0]) return res.status(404).json({ error: 'Dossier introuvable.' });
    res.json({ data: r.rows[0], message: 'Dossier mis à jour.' });
  } catch (err) { next(err); }
};

/** PATCH /api/maintenance/:id/close — Clôturer la maintenance */
const close = async (req, res, next) => {
  try {
    const { cout, description, next_statut = 'disponible' } = req.body;

    const existing = await query(
      `SELECT vehicule_id FROM maintenance_vehicules WHERE id = $1`,
      [req.params.id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Dossier introuvable.' });

    const vehicule_id = existing.rows[0].vehicule_id;

    // Clôturer le dossier de maintenance
    const r = await query(`
      UPDATE maintenance_vehicules
      SET statut = 'terminee',
          date_fin = COALESCE(date_fin, CURRENT_DATE)
          ${cout        ? ', cout = $2'        : ''}
          ${description ? ', description = $3' : ''}
      WHERE id = $1
      RETURNING *
    `, [req.params.id, ...(cout ? [cout] : []), ...(description ? [description] : [])]);

    // Remettre le véhicule dans le statut demandé (disponible ou hors_service)
    await query(
      `UPDATE vehicules SET statut = $1 WHERE id = $2`,
      [next_statut, vehicule_id]
    );

    res.json({
      data:    r.rows[0],
      message: `Maintenance clôturée. Véhicule remis en "${next_statut}".`,
    });
  } catch (err) { next(err); }
};

/** DELETE /api/maintenance/:id */
const remove = async (req, res, next) => {
  try {
    // Vérifier si le dossier est en cours avant suppression
    const existing = await query(
      `SELECT vehicule_id, statut FROM maintenance_vehicules WHERE id = $1`,
      [req.params.id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Dossier introuvable.' });

    if (existing.rows[0].statut === 'en_cours')
      return res.status(400).json({ error: 'Impossible de supprimer une maintenance en cours. Clôturez-la d\'abord.' });

    await query('DELETE FROM maintenance_vehicules WHERE id = $1', [req.params.id]);
    res.json({ message: 'Dossier supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update, close, remove, TYPES_MAINTENANCE };
