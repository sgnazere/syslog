const { query } = require('../config/database');

/** GET /api/audit
 *  Paramètres : userId, entity, action, from, to, page, limit
 */
const getAll = async (req, res, next) => {
  try {
    const { userId, entity, action, from, to } = req.query;
    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const params = [];
    let where = ' WHERE 1=1';

    if (userId) { params.push(userId); where += ` AND al.user_id   = $${params.length}`; }
    if (entity) { params.push(entity); where += ` AND al.entity    = $${params.length}`; }
    if (action) { params.push(action); where += ` AND al.action    = $${params.length}`; }
    if (from)   { params.push(from);   where += ` AND al.created_at >= $${params.length}`; }
    if (to)     { params.push(to);     where += ` AND al.created_at <= $${params.length}::date + interval '1 day'`; }

    const sql = `
      SELECT
        al.id, al.action, al.entity, al.entity_id,
        al.details, al.ip_address, al.created_at,
        al.user_id,
        COALESCE(u.prenom || ' ' || u.nom, 'Compte supprimé') AS user_name,
        u.email                  AS user_email,
        u.role                   AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${where}
      ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    params.push(limit, offset);

    // Comptage total (pour pagination)
    const countSql = `SELECT COUNT(*) FROM audit_logs al ${where}`;
    const countParams = params.slice(0, params.length - 2); // sans limit/offset

    const [r, cnt] = await Promise.all([
      query(sql, params),
      query(countSql, countParams),
    ]);

    res.json({
      data:  r.rows,
      total: parseInt(cnt.rows[0].count),
      page,
      limit,
      pages: Math.ceil(parseInt(cnt.rows[0].count) / limit),
    });
  } catch (err) { next(err); }
};

/** GET /api/audit/meta — valeurs distinctes pour les filtres */
const getMeta = async (req, res, next) => {
  try {
    const [entities, actions, users] = await Promise.all([
      query(`SELECT DISTINCT entity FROM audit_logs ORDER BY entity`),
      query(`SELECT DISTINCT action  FROM audit_logs ORDER BY action`),
      query(`
        SELECT DISTINCT al.user_id,
               u.prenom || ' ' || u.nom AS user_name,
               u.email
        FROM audit_logs al
        JOIN users u ON u.id = al.user_id
        ORDER BY user_name`),
    ]);
    res.json({
      entities: entities.rows.map(r => r.entity),
      actions:  actions.rows.map(r => r.action),
      users:    users.rows,
    });
  } catch (err) { next(err); }
};

module.exports = { getAll, getMeta };
