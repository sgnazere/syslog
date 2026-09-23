require('dotenv').config();
const { query } = require('../config/database');

// Colonnes réelles en base : created_at / updated_at (pas date_creation / date_modification)
const fmtEmployee = (e) => e ? {
  ...e,
  // Normalisation des noms vers l'interface TypeScript attendue par le frontend
  date_creation:    e.created_at    ?? e.date_creation    ?? null,
  date_modification: e.updated_at   ?? e.date_modification ?? null,
  name: `${e.prenoms} ${e.nom}`,
} : null;

/** GET /api/employees */
const getAll = async (req, res, next) => {
  try {
    const { statut, service_id, search } = req.query;
    const params = [];

    let where = ' WHERE 1=1';
    if (statut)     { params.push(statut);     where += ` AND e.status = $${params.length}`; }
    if (service_id) { params.push(service_id); where += ` AND e.service_id = $${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      where += ` AND (e.nom ILIKE $${n} OR e.prenoms ILIKE $${n} OR e.email ILIKE $${n} OR e.poste ILIKE $${n})`;
    }

    const sqlWithJoin = `
      SELECT e.id, e.nom, e.prenoms, e.email, e.date_naissance,
             e.poste, e.projet, e.service_id, e.date_embauche,
             e.telephone, e.numero_secu, e.numero_urgence, e.type_contrat,
             e.status, e.created_at, e.updated_at,
             s.nom AS service_nom
      FROM employees e
      LEFT JOIN services s ON s.id = e.service_id
      ${where}
      ORDER BY e.nom, e.prenoms`;

    const sqlNoJoin = `
      SELECT e.id, e.nom, e.prenoms, e.email, e.date_naissance,
             e.poste, e.projet, e.service_id, e.date_embauche,
             e.telephone, e.numero_secu, e.numero_urgence, e.type_contrat,
             e.status, e.created_at, e.updated_at,
             NULL AS service_nom
      FROM employees e
      ${where}
      ORDER BY e.nom, e.prenoms`;

    let r;
    try {
      r = await query(sqlWithJoin, params);
    } catch (joinErr) {
      if (joinErr.code === '42P01') {
        r = await query(sqlNoJoin, params);
      } else {
        throw joinErr;
      }
    }

    res.json({ data: r.rows.map(fmtEmployee), total: r.rowCount });
  } catch (err) { next(err); }
};

/** GET /api/employees/:id */
const getById = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT e.id, e.nom, e.prenoms, e.email, e.date_naissance,
              e.poste, e.projet, e.service_id, e.date_embauche,
              e.telephone, e.numero_secu, e.numero_urgence, e.type_contrat,
              e.status, e.created_at, e.updated_at,
              s.nom AS service_nom
       FROM employees e
       LEFT JOIN services s ON s.id = e.service_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ data: fmtEmployee(r.rows[0]) });
  } catch (err) { next(err); }
};

/** POST /api/employees */
const create = async (req, res, next) => {
  try {
    const {
      nom, prenoms, email, date_naissance, poste, projet,
      service_id, date_embauche, telephone, numero_secu,
      numero_urgence, type_contrat, status,
    } = req.body;

    if (!nom || !prenoms) {
      return res.status(400).json({ error: 'Nom et prénoms requis.' });
    }

    const r = await query(
      `INSERT INTO employees
         (nom, prenoms, email, date_naissance, poste, projet, service_id,
          date_embauche, telephone, numero_secu, numero_urgence, type_contrat, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, nom, prenoms, email, date_naissance, poste, projet, service_id,
                 date_embauche, telephone, numero_secu, numero_urgence, type_contrat,
                 status, created_at, updated_at`,
      [
        nom, prenoms, email || null, date_naissance || null,
        poste || null, projet || null, service_id || null,
        date_embauche || null, telephone || null,
        numero_secu || null, numero_urgence || null,
        type_contrat || null, status || 'actif',
      ]
    );
    res.status(201).json({ data: fmtEmployee(r.rows[0]), message: 'Employé créé.' });
  } catch (err) { next(err); }
};

/** PUT /api/employees/:id */
const update = async (req, res, next) => {
  try {
    const {
      nom, prenoms, email, date_naissance, poste, projet,
      service_id, date_embauche, telephone, numero_secu,
      numero_urgence, type_contrat, status,
    } = req.body;

    const r = await query(
      `UPDATE employees
       SET nom=$1, prenoms=$2, email=$3, date_naissance=$4, poste=$5, projet=$6,
           service_id=$7, date_embauche=$8, telephone=$9, numero_secu=$10,
           numero_urgence=$11, type_contrat=$12, status=$13
       WHERE id=$14
       RETURNING id, nom, prenoms, email, date_naissance, poste, projet, service_id,
                 date_embauche, telephone, numero_secu, numero_urgence, type_contrat,
                 status, created_at, updated_at`,
      [
        nom, prenoms, email || null, date_naissance || null,
        poste || null, projet || null, service_id || null,
        date_embauche || null, telephone || null,
        numero_secu || null, numero_urgence || null,
        type_contrat || null, status,
        req.params.id,
      ]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ data: fmtEmployee(r.rows[0]), message: 'Employé mis à jour.' });
  } catch (err) { next(err); }
};

/** DELETE /api/employees/:id */
const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM employees WHERE id=$1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ message: 'Employé supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
