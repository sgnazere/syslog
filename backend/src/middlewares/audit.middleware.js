const { query }  = require('../config/database');
const { redact } = require('../utils/redact');

/**
 * Middleware d'audit : enregistre les actions réussies (2xx) dans audit_logs.
 * Les champs sensibles (mots de passe, clés, jetons) sont masqués.
 */
const auditLog = (action, entity) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (data) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const entityId = data?.data?.id || req.params?.id || 'N/A';
      const details  = JSON.stringify({ body: redact(req.body), params: req.params }).substring(0, 1000);
      query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.user.id, action, entity, String(entityId), details, req.ip]
      ).catch(err => console.error('Erreur audit log:', err.message));
    }
    return originalJson(data);
  };
  next();
};

module.exports = { auditLog };
