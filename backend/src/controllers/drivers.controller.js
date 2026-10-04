const { query } = require('../config/database');

const withName = (d) => ({ ...d, name: `${d.prenoms} ${d.nom}` });

/** GET /api/drivers  →  table chauffeurs */
const getAll = async (req, res, next) => {
  try {
    const { statut } = req.query;
    let sql = `SELECT * FROM chauffeurs WHERE 1=1`;
    const params = [];
    if (statut) { params.push(statut); sql += ` AND statut = $${params.length}`; }
    sql += ' ORDER BY nom, prenoms';
    const r = await query(sql, params);
    res.json({ data: r.rows.map(withName) });
  } catch (err) { next(err); }
};

const params = (b) => [
  b.nom.trim(), b.prenoms.trim(), b.numero_permis.trim(), b.type_permis, b.date_expiration_permis,
  b.telephone || null, b.email || null, b.statut || null,
];

const create = async (req, res, next) => {
  try {
    const r = await query(
      `INSERT INTO chauffeurs (nom, prenoms, numero_permis, type_permis, date_expiration_permis, telephone, email, statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::chauffeur_statut, 'disponible')) RETURNING *`,
      params(req.body)
    );
    res.status(201).json({ data: withName(r.rows[0]), message: 'Chauffeur ajouté.' });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE chauffeurs
       SET nom = $1, prenoms = $2, numero_permis = $3, type_permis = $4, date_expiration_permis = $5,
           telephone = $6, email = $7, statut = COALESCE($8::chauffeur_statut, statut)
       WHERE id = $9 RETURNING *`,
      [...params(req.body), req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable.' });
    res.json({ data: withName(r.rows[0]), message: 'Chauffeur mis à jour.' });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM chauffeurs WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Chauffeur introuvable.' });
    res.json({ message: 'Chauffeur supprimé.' });
  } catch (err) {
    if (err.code === '23503')
      return res.status(409).json({ error: 'Ce chauffeur a déjà effectué des missions : passez-le plutôt « indisponible ».' });
    next(err);
  }
};

module.exports = { getAll, create, update, remove };
