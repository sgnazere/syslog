const { query } = require('../config/database');

const EMPLOYEE_FIELDS = `
  e.id, e.nom, e.prenoms, e.email, e.date_naissance, e.poste, e.projet, e.service_id,
  e.date_embauche, e.telephone, e.numero_secu, e.numero_urgence, e.type_contrat,
  e.status, e.created_at, e.updated_at, s.nom AS service_nom
`;

const WRITABLE = [
  'nom', 'prenoms', 'email', 'date_naissance', 'poste', 'projet', 'service_id',
  'date_embauche', 'telephone', 'numero_secu', 'numero_urgence', 'type_contrat', 'status',
];

const fmtEmployee = (e) => e ? {
  ...e,
  date_creation:     e.created_at,
  date_modification: e.updated_at,
  name: `${e.prenoms} ${e.nom}`,
} : null;

const valuesFrom = (body) => WRITABLE.map(k => {
  const v = body[k];
  if (k === 'status') return v || 'actif';
  return v === '' || v === undefined ? null : v;
});

const findEmployee = async (id) => {
  const r = await query(
    `SELECT ${EMPLOYEE_FIELDS} FROM employees e LEFT JOIN services s ON s.id = e.service_id WHERE e.id = $1`, [id]
  );
  return fmtEmployee(r.rows[0]);
};

/** GET /api/employees — admin, manager */
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

    const r = await query(
      `SELECT ${EMPLOYEE_FIELDS} FROM employees e LEFT JOIN services s ON s.id = e.service_id
       ${where} ORDER BY e.nom, e.prenoms`,
      params
    );
    res.json({ data: r.rows.map(fmtEmployee), total: r.rowCount });
  } catch (err) { next(err); }
};

/** GET /api/employees/:id — admin */
const getById = async (req, res, next) => {
  try {
    const employee = await findEmployee(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ data: employee });
  } catch (err) { next(err); }
};

/** POST /api/employees — admin */
const create = async (req, res, next) => {
  try {
    const r = await query(
      `INSERT INTO employees (${WRITABLE.join(', ')})
       VALUES (${WRITABLE.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
      valuesFrom(req.body)
    );
    res.status(201).json({ data: await findEmployee(r.rows[0].id), message: 'Employé créé.' });
  } catch (err) { next(err); }
};

/** PUT /api/employees/:id — admin */
const update = async (req, res, next) => {
  try {
    const r = await query(
      `UPDATE employees SET ${WRITABLE.map((k, i) => `${k} = $${i + 1}`).join(', ')}
       WHERE id = $${WRITABLE.length + 1} RETURNING id`,
      [...valuesFrom(req.body), req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ data: await findEmployee(req.params.id), message: 'Employé mis à jour.' });
  } catch (err) { next(err); }
};

/** DELETE /api/employees/:id — admin (refusé si l'employé a des demandes : le passer inactif) */
const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM employees WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Employé introuvable.' });
    res.json({ message: 'Employé supprimé.' });
  } catch (err) {
    if (err.code === '23503')
      return res.status(409).json({ error: 'Cet employé figure dans des demandes : passez-le plutôt en « inactif ».' });
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
