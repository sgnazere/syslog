const { query } = require('../config/database');

/** GET /api/vehicles  →  table vehicules */
const getAll = async (req, res, next) => {
  try {
    const { statut, type_vehicule } = req.query;
    let sql = `SELECT * FROM vehicules WHERE 1=1`;
    const params = [];
    if (statut)        { params.push(statut);        sql += ` AND statut = $${params.length}`; }
    if (type_vehicule) { params.push(type_vehicule); sql += ` AND type_vehicule = $${params.length}`; }
    sql += ' ORDER BY marque, modele';
    const r = await query(sql, params);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM vehicules WHERE id = $1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ data: r.rows[0] });
  } catch (err) { next(err); }
};

const params = (b) => [
  b.immatriculation.trim().toUpperCase(), b.marque, b.modele, b.type_vehicule, b.capacite,
  b.kilometrage || 0, b.annee_mise_service || null, b.energie || 'Diesel', b.statut || null,
];

const create = async (req, res, next) => {
  try {
    const r = await query(
      `INSERT INTO vehicules (immatriculation, marque, modele, type_vehicule, capacite, kilometrage, annee_mise_service, energie, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::vehicule_statut, 'disponible')) RETURNING *`,
      params(req.body)
    );
    res.status(201).json({ data: r.rows[0], message: 'Véhicule ajouté.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Immatriculation déjà utilisée.' });
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE vehicules
       SET immatriculation = $1, marque = $2, modele = $3, type_vehicule = $4, capacite = $5,
           kilometrage = $6, annee_mise_service = $7, energie = $8, statut = COALESCE($9::vehicule_statut, statut)
       WHERE id = $10 RETURNING *`,
      [...params(req.body), req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ data: r.rows[0], message: 'Véhicule mis à jour.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Immatriculation déjà utilisée.' });
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM vehicules WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ message: 'Véhicule supprimé.' });
  } catch (err) {
    if (err.code === '23503')
      return res.status(409).json({ error: 'Ce véhicule a un historique (missions, maintenance) : passez-le plutôt « hors service ».' });
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
