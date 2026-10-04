const { query, withTransaction } = require('../config/database');
const { HttpError } = require('../utils/httpError');

/** Remet le véhicule « disponible » s'il n'a plus aucun dossier ouvert. */
const releaseVehicleIfIdle = (client, vehiculeId, nextStatut = 'disponible') =>
  client.query(
    `UPDATE vehicules SET statut = $2
     WHERE id = $1 AND statut = 'en_maintenance'
       AND NOT EXISTS (SELECT 1 FROM maintenance_vehicules
                       WHERE vehicule_id = $1 AND statut IN ('planifiee', 'en_cours'))`,
    [vehiculeId, nextStatut]
  );

/** GET /api/maintenance */
const getAll = async (req, res, next) => {
  try {
    const { vehicule_id, statut } = req.query;
    const params = [];
    let where = ' WHERE 1=1';
    if (vehicule_id) { params.push(vehicule_id); where += ` AND m.vehicule_id = $${params.length}`; }
    if (statut)      { params.push(statut);      where += ` AND m.statut = $${params.length}`; }

    const r = await query(`
      SELECT m.*, v.immatriculation, v.marque, v.modele, v.kilometrage AS km_actuel
      FROM maintenance_vehicules m
      JOIN vehicules v ON v.id = m.vehicule_id
      ${where}
      ORDER BY CASE m.statut WHEN 'en_cours' THEN 1 WHEN 'planifiee' THEN 2 ELSE 3 END,
               m.date_debut DESC
    `, params);
    res.json({ data: r.rows, total: r.rowCount });
  } catch (err) { next(err); }
};

/** POST /api/maintenance — le véhicule passe « en maintenance » */
const create = async (req, res, next) => {
  try {
    const { vehicule_id, type_maintenance, date_debut, date_fin, cout, description, statut = 'planifiee' } = req.body;

    const created = await withTransaction(async (client) => {
      const v = (await client.query('SELECT statut FROM vehicules WHERE id = $1 FOR UPDATE', [vehicule_id])).rows[0];
      if (!v) throw new HttpError(404, 'Véhicule introuvable.');
      if (v.statut === 'en_mission')
        throw new HttpError(409, 'Ce véhicule est en mission : clôturez d\'abord la mission.');

      const r = await client.query(`
        INSERT INTO maintenance_vehicules (vehicule_id, type_maintenance, date_debut, date_fin, cout, description, statut)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [vehicule_id, type_maintenance, date_debut, date_fin || null, cout ?? null, description || null, statut]);

      if (v.statut === 'disponible') {
        await client.query(`UPDATE vehicules SET statut = 'en_maintenance' WHERE id = $1`, [vehicule_id]);
      }
      return r.rows[0];
    });

    res.status(201).json({ data: created, message: 'Dossier de maintenance créé.' });
  } catch (err) { next(err); }
};

/** PUT /api/maintenance/:id — modifie un dossier ouvert */
const update = async (req, res, next) => {
  try {
    const { type_maintenance, date_debut, date_fin, cout, description, statut } = req.body;
    const r = await query(`
      UPDATE maintenance_vehicules
      SET type_maintenance = $1, date_debut = $2, date_fin = $3, cout = $4, description = $5,
          statut = COALESCE($6::maintenance_statut, statut)
      WHERE id = $7 AND statut != 'terminee'
      RETURNING *
    `, [type_maintenance, date_debut, date_fin || null, cout ?? null, description || null, statut || null, req.params.id]);

    if (!r.rows[0]) return res.status(404).json({ error: 'Dossier introuvable ou déjà clôturé.' });
    res.json({ data: r.rows[0], message: 'Dossier mis à jour.' });
  } catch (err) { next(err); }
};

/** PATCH /api/maintenance/:id/close — clôture et remet le véhicule en service (ou hors service) */
const close = async (req, res, next) => {
  try {
    const { cout, description, next_statut = 'disponible' } = req.body;

    const closed = await withTransaction(async (client) => {
      const cur = (await client.query(
        'SELECT vehicule_id, statut FROM maintenance_vehicules WHERE id = $1 FOR UPDATE', [req.params.id]
      )).rows[0];
      if (!cur) throw new HttpError(404, 'Dossier introuvable.');
      if (cur.statut === 'terminee') throw new HttpError(409, 'Ce dossier est déjà clôturé.');

      const r = await client.query(`
        UPDATE maintenance_vehicules
        SET statut = 'terminee', date_fin = COALESCE(date_fin, CURRENT_DATE),
            cout = COALESCE($2, cout), description = COALESCE($3, description)
        WHERE id = $1 RETURNING *
      `, [req.params.id, cout ?? null, description || null]);

      if (next_statut === 'hors_service') {
        await client.query(`UPDATE vehicules SET statut = 'hors_service' WHERE id = $1 AND statut != 'en_mission'`, [cur.vehicule_id]);
      } else {
        await releaseVehicleIfIdle(client, cur.vehicule_id);
      }
      return r.rows[0];
    });

    res.json({
      data:    closed,
      message: `Maintenance clôturée. Véhicule remis en « ${next_statut === 'hors_service' ? 'hors service' : 'disponible'} ».`,
    });
  } catch (err) { next(err); }
};

/** DELETE /api/maintenance/:id — impossible pour un dossier en cours */
const remove = async (req, res, next) => {
  try {
    await withTransaction(async (client) => {
      const cur = (await client.query(
        'SELECT vehicule_id, statut FROM maintenance_vehicules WHERE id = $1 FOR UPDATE', [req.params.id]
      )).rows[0];
      if (!cur) throw new HttpError(404, 'Dossier introuvable.');
      if (cur.statut === 'en_cours')
        throw new HttpError(409, 'Impossible de supprimer une maintenance en cours. Clôturez-la d\'abord.');

      await client.query('DELETE FROM maintenance_vehicules WHERE id = $1', [req.params.id]);
      await releaseVehicleIfIdle(client, cur.vehicule_id);
    });
    res.json({ message: 'Dossier supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, update, close, remove };
