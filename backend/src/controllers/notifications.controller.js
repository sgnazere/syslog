const { query } = require('../config/database');

/** GET /api/notifications — 50 dernières notifications de l'utilisateur */
const getMine = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, title, message, type, read, request_id, created_at
       FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/:id/read */
const markRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification lue.' });
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/read-all */
const markAllRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read = true WHERE user_id = $1 AND read = false', [req.user.id]);
    res.json({ message: 'Toutes les notifications lues.' });
  } catch (err) { next(err); }
};

module.exports = { getMine, markRead, markAllRead };
