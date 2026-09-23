require('dotenv').config();
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
    const r = await query('SELECT * FROM vehicules WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ data: r.rows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { immatriculation, marque, modele, type_vehicule, capacite, kilometrage, annee_mise_service, energie } = req.body;
    const exists = await query('SELECT id FROM vehicules WHERE immatriculation=$1', [immatriculation.toUpperCase()]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Immatriculation déjà utilisée.' });
    const r = await query(
      `INSERT INTO vehicules (immatriculation, marque, modele, type_vehicule, capacite, kilometrage, annee_mise_service, energie)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [immatriculation.toUpperCase(), marque, modele, type_vehicule || '', capacite, kilometrage || 0, annee_mise_service || null, energie || 'Diesel']
    );
    res.status(201).json({ data: r.rows[0], message: 'Véhicule ajouté.' });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { immatriculation, marque, modele, type_vehicule, capacite, kilometrage, annee_mise_service, statut, energie } = req.body;
    const r = await query(
      `UPDATE vehicules
       SET immatriculation=$1, marque=$2, modele=$3, type_vehicule=$4,
           capacite=$5, kilometrage=$6, annee_mise_service=$7, statut=$8, energie=$9
       WHERE id=$10 RETURNING *`,
      [immatriculation.toUpperCase(), marque, modele, type_vehicule || '', capacite, kilometrage || 0, annee_mise_service || null, statut, energie || 'Diesel', req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ data: r.rows[0], message: 'Véhicule mis à jour.' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM vehicules WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Véhicule introuvable.' });
    res.json({ message: 'Véhicule supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
