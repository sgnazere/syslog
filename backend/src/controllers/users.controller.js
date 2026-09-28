const { hashPassword } = require('../utils/password');
const { query, withTransaction } = require('../config/database');
const { clearSessionCache } = require('../middlewares/auth.middleware');
const { HttpError } = require('../utils/httpError');

const USER_FIELDS = `
  u.id, u.employee_id, u.nom, u.prenom, u.email, u.role, u.is_active,
  u.must_change_password, u.date_creation, u.date_modification, u.last_login,
  e.poste AS employee_poste, e.projet AS employee_projet, s.nom AS service_nom
`;
const USER_JOINS = `
  FROM users u
  LEFT JOIN employees e ON e.id = u.employee_id
  LEFT JOIN services  s ON s.id = e.service_id
`;

const fmt = (u) => u ? ({ ...u, name: `${u.prenom} ${u.nom}` }) : null;

const findUser = async (id, client = { query }) => {
  const r = await client.query(`SELECT ${USER_FIELDS} ${USER_JOINS} WHERE u.id = $1`, [id]);
  return fmt(r.rows[0]);
};

const getEmployee = async (employeeId) => {
  if (!employeeId) return null;
  const r = await query(
    `SELECT id, nom, prenoms, email FROM employees WHERE id = $1`, [employeeId]
  );
  return r.rows[0] || null;
};

const ADMIN_ROLES = ['admin', 'superadmin'];

const countOtherActiveAdmins = async (client, userId) => {
  const r = await client.query(
    `SELECT COUNT(*) AS n FROM users WHERE role IN ('admin', 'superadmin') AND is_active = true AND id != $1`, [userId]
  );
  return parseInt(r.rows[0].n, 10);
};

/**
 * Seul un super-administrateur peut attribuer ce rôle
 * ou agir sur un compte super-administrateur.
 */
const assertCanManage = (actor, targetRole, newRole) => {
  if (actor.role === 'superadmin') return;
  if (targetRole === 'superadmin' || newRole === 'superadmin')
    throw new HttpError(403, 'Seul un super-administrateur peut gérer les comptes super-administrateur.');
};

/**
 * Limite d'utilisateurs actifs de la licence (comptes super-administrateur non comptés).
 * `excludeId` : compte en cours de modification, déjà compté s'il est actif.
 */
const assertUserQuota = async (client, excludeId = 0) => {
  const lic = (await client.query(`SELECT max_utilisateurs FROM licences WHERE statut = 'active' LIMIT 1`)).rows[0];
  if (!lic) return;
  const r = await client.query(
    `SELECT COUNT(*) AS n FROM users WHERE is_active = true AND role != 'superadmin' AND id != $1`, [excludeId]);
  if (parseInt(r.rows[0].n, 10) >= lic.max_utilisateurs)
    throw new HttpError(403, `Limite de la licence atteinte : ${lic.max_utilisateurs} utilisateurs actifs au maximum.`);
};

const revokeSessions = (client, userId) =>
  client.query('DELETE FROM sessions_actives WHERE user_id = $1', [userId]);

/** GET /api/users */
const getAll = async (req, res, next) => {
  try {
    const { role, active, search } = req.query;
    let sql = `SELECT ${USER_FIELDS} ${USER_JOINS} WHERE 1=1`;
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
    const user = await findUser(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ data: user });
  } catch (err) { next(err); }
};

/** POST /api/users — le mot de passe devra être changé à la première connexion */
const create = async (req, res, next) => {
  try {
    const { employee_id, nom, prenom, email, password, role } = req.body;
    assertCanManage(req.user, null, role);
    const employee = await getEmployee(employee_id);
    if (employee_id && !employee) return res.status(404).json({ error: 'Employé introuvable.' });

    const finalNom    = (employee?.nom || nom || '').trim();
    const finalPrenom = (employee?.prenoms || prenom || '').trim();
    const finalEmail  = (email || employee?.email || '').toLowerCase().trim();
    if (!finalNom || !finalPrenom || !finalEmail)
      return res.status(400).json({ error: 'Nom, prénom et email requis.' });

    const exists = await query('SELECT id FROM users WHERE LOWER(email) = $1', [finalEmail]);
    if (exists.rows[0]) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

    if (role !== 'superadmin') await assertUserQuota({ query });
    const hash = await hashPassword(password);
    const r = await query(
      `INSERT INTO users (employee_id, nom, prenom, email, password, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id`,
      [employee?.id || null, finalNom, finalPrenom, finalEmail, hash, role]
    );
    res.status(201).json({ data: await findUser(r.rows[0].id), message: 'Utilisateur créé.' });
  } catch (err) { next(err); }
};

/** PUT /api/users/:id */
const update = async (req, res, next) => {
  try {
    const { employee_id, nom, prenom, email, role, is_active } = req.body;
    const employee = await getEmployee(employee_id);
    if (employee_id && !employee) return res.status(404).json({ error: 'Employé introuvable.' });

    const finalNom    = (employee?.nom || nom || '').trim();
    const finalPrenom = (employee?.prenoms || prenom || '').trim();
    const finalEmail  = (email || employee?.email || '').toLowerCase().trim();
    if (!finalNom || !finalPrenom || !finalEmail)
      return res.status(400).json({ error: 'Nom, prénom et email requis.' });

    const targetId = parseInt(req.params.id, 10);
    const user = await withTransaction(async (client) => {
      const current = (await client.query('SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE', [targetId])).rows[0];
      if (!current) return null;
      assertCanManage(req.user, current.role, role);
      if (current.role === 'superadmin' && (role !== 'superadmin' || is_active === false)) {
        const others = await client.query(
          `SELECT 1 FROM users WHERE role = 'superadmin' AND is_active = true AND id != $1`, [targetId]);
        if (!others.rowCount) throw new HttpError(400, 'Impossible : il doit rester au moins un super-administrateur actif.');
      }

      const nextActive = typeof is_active === 'boolean' ? is_active : current.is_active;
      const losesAdmin = ADMIN_ROLES.includes(current.role) && current.is_active
        && (!ADMIN_ROLES.includes(role) || !nextActive);
      if (losesAdmin && targetId === req.user.id)
        throw new HttpError(400, 'Vous ne pouvez pas retirer vos propres droits d\'administrateur.');
      if (losesAdmin && await countOtherActiveAdmins(client, targetId) === 0)
        throw new HttpError(400, 'Impossible : il doit rester au moins un administrateur actif.');

      if (nextActive && role !== 'superadmin' && (!current.is_active || current.role === 'superadmin'))
        await assertUserQuota(client, targetId);

      await client.query(
        `UPDATE users SET employee_id = $1, nom = $2, prenom = $3, email = $4, role = $5, is_active = $6
         WHERE id = $7`,
        [employee?.id || null, finalNom, finalPrenom, finalEmail, role, nextActive, targetId]
      );
      if (role !== current.role || !nextActive) await revokeSessions(client, targetId);
      return findUser(targetId, client);
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    clearSessionCache();
    res.json({ data: user, message: 'Utilisateur mis à jour.' });
  } catch (err) { next(err); }
};

/** PATCH /api/users/:id/toggle-active */
const toggleActive = async (req, res, next) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (targetId === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });

    const user = await withTransaction(async (client) => {
      const current = (await client.query('SELECT role, is_active FROM users WHERE id = $1 FOR UPDATE', [targetId])).rows[0];
      if (!current) return null;
      assertCanManage(req.user, current.role);
      if (ADMIN_ROLES.includes(current.role) && current.is_active && await countOtherActiveAdmins(client, targetId) === 0)
        throw new HttpError(400, 'Impossible : il doit rester au moins un administrateur actif.');

      if (!current.is_active && current.role !== 'superadmin') await assertUserQuota(client, targetId);
      await client.query('UPDATE users SET is_active = NOT is_active WHERE id = $1', [targetId]);
      if (current.is_active) await revokeSessions(client, targetId);
      return findUser(targetId, client);
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    clearSessionCache();
    res.json({ data: user, message: `Compte ${user.is_active ? 'activé' : 'désactivé'}.` });
  } catch (err) { next(err); }
};

/** PUT /api/users/:id/reset-password — ferme les sessions et impose un changement */
const resetPassword = async (req, res, next) => {
  try {
    const hash = await hashPassword(req.body.newPassword);
    const updated = await withTransaction(async (client) => {
      const current = (await client.query('SELECT role FROM users WHERE id = $1 FOR UPDATE', [req.params.id])).rows[0];
      if (!current) return false;
      assertCanManage(req.user, current.role);
      const r = await client.query(
        'UPDATE users SET password = $1, must_change_password = true WHERE id = $2 RETURNING id',
        [hash, req.params.id]
      );
      if (!r.rows[0]) return false;
      await revokeSessions(client, req.params.id);
      return true;
    });
    if (!updated) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    clearSessionCache();
    res.json({ message: 'Mot de passe réinitialisé. L\'utilisateur devra le changer à sa prochaine connexion.' });
  } catch (err) { next(err); }
};

/**
 * GET /api/users/employees
 * Liste minimale des employés actifs pour les listes de sélection
 * (aucune donnée personnelle : ni téléphone, ni e-mail).
 */
const getEmployees = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT e.id, e.nom, e.prenoms, e.poste, e.projet, s.nom AS service_nom,
              EXISTS (SELECT 1 FROM users u WHERE u.employee_id = e.id) AS has_account
       FROM employees e
       LEFT JOIN services s ON s.id = e.service_id
       WHERE e.status = 'actif'
       ORDER BY e.nom, e.prenoms`
    );
    res.json({ data: result.rows.map(e => ({ ...e, name: `${e.prenoms} ${e.nom}` })) });
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, toggleActive, resetPassword, getEmployees };
