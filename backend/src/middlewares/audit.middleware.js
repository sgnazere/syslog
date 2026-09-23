const { query } = require('../config/database');

/**
 * Middleware d'audit automatique.
 * Enregistre toute action mutante (POST/PUT/PATCH/DELETE) dans audit_logs.
 */
const auditLog = (action, entity) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (data) {
    // N'audite que les succès (2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      try {
        const entityId =
          data?.data?.id ||
          req.params?.id ||
          'N/A';
        const details = JSON.stringify({
          body: req.body,
          params: req.params,
        }).substring(0, 500);

        await query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.id, action, entity, String(entityId), details, req.ip]
        );
      } catch (err) {
        console.error('Erreur audit log:', err.message);
      }
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
