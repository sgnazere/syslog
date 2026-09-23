const { query } = require('../config/database');

const getMine = async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};
const markRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification lue.' });
  } catch (err) { next(err); }
};
const markAllRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Toutes les notifications lues.' });
  } catch (err) { next(err); }
};
module.exports = { getMine, markRead, markAllRead };
