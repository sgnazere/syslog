/**
 * Notifications internes (cloche de l'application).
 */
const { query } = require('../config/database');

/** Comptes actifs liés à des fiches employé. */
const userIdsForEmployees = async (employeeIds) => {
  const ids = [...new Set(employeeIds.filter(Boolean))];
  if (!ids.length) return [];
  const r = await query(
    `SELECT id FROM users WHERE employee_id = ANY($1::int[]) AND is_active = true`, [ids]
  );
  return r.rows.map(row => row.id);
};

/** Comptes actifs des managers et administrateurs (dont super-administrateurs). */
const managerUserIds = async () => {
  const r = await query(`SELECT id FROM users WHERE role IN ('superadmin', 'admin', 'manager') AND is_active = true`);
  return r.rows.map(row => row.id);
};

/**
 * Crée une notification pour chaque utilisateur (sauf `excludeUserId`, l'auteur de l'action).
 */
const notifyUsers = async (userIds, { title, message, type = 'info', requestId = null }, excludeUserId) => {
  const ids = [...new Set(userIds)].filter(id => id !== excludeUserId);
  if (!ids.length) return;
  await query(
    `INSERT INTO notifications (user_id, title, message, type, request_id)
     SELECT unnest($1::int[]), $2, $3, $4, $5`,
    [ids, title, message, type, requestId]
  );
};

/** Exécute une tâche de notification sans bloquer ni faire échouer la requête. */
const fireAndForget = (label, task) => {
  Promise.resolve().then(task).catch(err => console.error(`[notifications] ${label} :`, err.message));
};

module.exports = { userIdsForEmployees, managerUserIds, notifyUsers, fireAndForget };
