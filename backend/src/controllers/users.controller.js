require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

let employeeLinkColumn;

const hasEmployeeLinkColumn = async () => {
  if (employeeLinkColumn !== undefined) return employeeLinkColumn;
  const result = await query(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'users' AND column_name = 'employee_id'
     ) AS exists`
  );
  employeeLinkColumn = !!result.rows[0]?.exists;
  return employeeLinkColumn;
};

const safeSelect = (withEmployeeId) => `
  u.id,
  ${withEmployeeId ? 'u.employee_id,' : 'NULL::integer AS employee_id,'}
  u.nom,
  u.prenom,
  u.email,
  u.role,
  u.is_active,
  u.date_creation,
  u.date_modification,
  u.last_login,
  e.poste AS employee_poste,
  e.projet AS employee_projet,
  s.nom AS service_nom
`;

const employeeJoin = (withEmployeeId) => withEmployeeId
  ? `LEFT JOIN employees e ON e.id = u.employee_id
     LEFT JOIN services s ON s.id = e.service_id`
  : `LEFT JOIN employees e ON LOWER(e.email) = LOWER(u.email)
     LEFT JOIN services s ON s.id = e.service_id`;

const fmt = (u) => u ? ({ ...u, name: `${u.prenom} ${u.nom}` }) : null;

const getEmployee = async (employeeId) => {
  if (!employeeId) return null;
  const result = await query(
    `SELECT id, nom, prenoms, email, poste, projet, service_id
     FROM employees
     WHERE id = $1`,
    [employeeId]
  );
  return result.rows[0] || null;
};

/** GET /api/users */
const getAll = async (req, res, next) => {
  try {
    const { role, active, search } = req.query;
    const linked = await hasEmployeeLinkColumn();
    let sql = `
      SELECT ${safeSelect(linked)}
      FROM users u
      ${employeeJoin(linked)}
      WHERE 1=1`;
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }
    if (active !== undefined) {
      params.push(active === 'true');
      sql += ` AND u.is_active = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      sql += ` AND (u.nom ILIKE $${n} OR u.prenom ILIKE $${n} OR u.email ILIKE $${n} OR e.poste ILIKE $${n} OR e.projet ILIKE $${n})`;
    }
    sql += ' ORDER BY u.nom ASC, u.prenom ASC';

    const result = await query(sql, params);
    res.json({ data: result.rows.map(fmt), total: result.rowCount });
  } catch (err) { next(err); }
};

/** GET /api/users/:id */
const getById = async (req, res, next) => {
  try {
    const linked = await hasEmployeeLinkColumn();
    const result = await query(
      `SELECT ${safeSelect(linked)}
       FROM users u
       ${employeeJoin(linked)}
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ data: fmt(result.rows[0]) });
  } catch (err) { next(err); }
};

/** POST /api/users */
const create = async (req, res, next) => {
  try {
    const { employee_id, nom, prenom, email, password, role } = req.body;
    const employee = await getEmployee(employee_id);

    if (employee_id && !employee) {
      return res.status(404).json({ error: 'Employe introuvable.' });
    }

    const finalNom = (employee?.nom || nom || '').trim();
    const finalPrenom = (employee?.prenoms || prenom || '').trim();
    const finalEmail = (email || employee?.email || '').toLowerCase().trim();

    if (!finalNom || !finalPrenom || !finalEmail) {
      return res.status(400).json({ error: 'Employe, nom, prenom et email requis.' });
    }

    const exists = await query('SELECT id FROM users WHERE email = $1', [finalEmail]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Cet email est deja utilise.' });

    const linked = await hasEmployeeLinkColumn();
    const hash = await bcrypt.hash(password, 12);

    const result = linked
      ? await query(
          `INSERT INTO users (employee_id, nom, prenom, email, password, role)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, employee_id, nom, prenom, email, role, is_active, date_creation, date_modification, last_login`,
          [employee?.id || null, finalNom, finalPrenom, finalEmail, hash, role]
        )
      : await query(
          `INSERT INTO users (nom, prenom, email, password, role)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, nom, prenom, email, role, is_active, date_creation, date_modification, last_login`,
          [finalNom, finalPrenom, finalEmail, hash, role]
        );

    res.status(201).json({ data: fmt(result.rows[0]), message: 'Utilisateur cree.' });
  } catch (err) { next(err); }
};

/** PUT /api/users/:id */
const update = async (req, res, next) => {
  try {
    const { employee_id, nom, prenom, email, role, is_active } = req.body;
    const employee = await getEmployee(employee_id);

    if (employee_id && !employee) {
      return res.status(404).json({ error: 'Employe introuvable.' });
    }

    const finalNom = (employee?.nom || nom || '').trim();
    const finalPrenom = (employee?.prenoms || prenom || '').trim();
    const finalEmail = (email || employee?.email || '').toLowerCase().trim();

    if (!finalNom || !finalPrenom || !finalEmail) {
      return res.status(400).json({ error: 'Employe, nom, prenom et email requis.' });
    }

    const linked = await hasEmployeeLinkColumn();
    const result = linked
      ? await query(
          `UPDATE users
           SET employee_id=$1, nom=$2, prenom=$3, email=$4, role=$5, is_active=$6,
               date_modification=CURRENT_TIMESTAMP
           WHERE id=$7
           RETURNING id, employee_id, nom, prenom, email, role, is_active, date_creation, date_modification, last_login`,
          [employee?.id || null, finalNom, finalPrenom, finalEmail, role, is_active, req.params.id]
        )
      : await query(
          `UPDATE users
           SET nom=$1, prenom=$2, email=$3, role=$4, is_active=$5,
               date_modification=CURRENT_TIMESTAMP
           WHERE id=$6
           RETURNING id, nom, prenom, email, role, is_active, date_creation, date_modification, last_login`,
          [finalNom, finalPrenom, finalEmail, role, is_active, req.params.id]
        );

    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ data: fmt(result.rows[0]), message: 'Utilisateur mis a jour.' });
  } catch (err) { next(err); }
};

/** PATCH /api/users/:id/toggle-active */
const toggleActive = async (req, res, next) => {
  try {
    const linked = await hasEmployeeLinkColumn();
    const result = await query(
      `UPDATE users u
       SET is_active = NOT is_active, date_modification = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, ${linked ? 'employee_id,' : ''} nom, prenom, email, role, is_active, date_creation, date_modification, last_login`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    const u = result.rows[0];
    res.json({
      data: fmt(u),
      message: `Compte ${u.is_active ? 'active' : 'desactive'}.`,
    });
  } catch (err) { next(err); }
};

/** PUT /api/users/:id/reset-password */
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password = $1, date_modification = CURRENT_TIMESTAMP WHERE id = $2',
      [hash, req.params.id]
    );
    res.json({ message: 'Mot de passe reinitialise.' });
  } catch (err) { next(err); }
};

/**
 * GET /api/users/employees
 * Liste des employes pour les selections.
 */
const getEmployees = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.nom, e.prenoms, e.email, e.poste, e.projet,
              e.telephone, e.status, s.nom AS service_nom
       FROM employees e
       LEFT JOIN services s ON s.id = e.service_id
       WHERE e.status = 'actif'
       ORDER BY e.nom, e.prenoms`,
    );
    res.json({
      data: result.rows.map(e => ({
        ...e,
        name: `${e.prenoms} ${e.nom}`,
      })),
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, toggleActive, resetPassword, getEmployees };
