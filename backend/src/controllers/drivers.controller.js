require('dotenv').config();
const { query } = require('../config/database');

/** GET /api/drivers  →  table chauffeurs */
const getAll = async (req, res, next) => {
  try {
    const { statut } = req.query;
    let sql = `SELECT *, nom || ' ' || prenoms AS name FROM chauffeurs WHERE 1=1`;
    const params = [];
    if (statut) { params.push(statut); sql += ` AND statut=$${params.length}`; }
    sql += ' ORDER BY nom, prenoms';
    const r = await query(sql, params);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const r = await query(`SELECT *, nom || ' ' || prenoms AS name FROM chauffeurs WHERE id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable.' });
    res.json({ data: r.rows[0] });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone, email } = req.body;
    const r = await query(
      `INSERT INTO chauffeurs (nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone, email)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone || null, email || null]
    );
    res.status(201).json({ data: { ...r.rows[0], name: `${r.rows[0].prenoms} ${r.rows[0].nom}` }, message: 'Chauffeur ajouté.' });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone, email, statut } = req.body;
    const r = await query(
      `UPDATE chauffeurs
       SET nom=$1, prenoms=$2, numero_permis=$3, type_permis=$4,
           date_expiration_permis=$5, telephone=$6, email=$7, statut=$8
       WHERE id=$9 RETURNING *`,
      [nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone || null, email || null, statut, req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable.' });
    res.json({ data: { ...r.rows[0], name: `${r.rows[0].prenoms} ${r.rows[0].nom}` }, message: 'Chauffeur mis à jour.' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM chauffeurs WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable.' });
    res.json({ message: 'Chauffeur supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
