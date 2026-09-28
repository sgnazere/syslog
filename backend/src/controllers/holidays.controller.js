const { query } = require('../config/database');

/** GET /api/holidays */
const getAll = async (req, res, next) => {
  try {
    const r = await query('SELECT id, name, date, recurring FROM holidays ORDER BY date ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

/** POST /api/holidays */
const create = async (req, res, next) => {
  try {
    const { name, date, recurring = false } = req.body;
    const r = await query(
      'INSERT INTO holidays (name, date, recurring) VALUES ($1, $2, $3) RETURNING id, name, date, recurring',
      [name.trim(), date, recurring]
    );
    res.status(201).json({ data: r.rows[0], message: 'Jour férié ajouté.' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Un jour férié existe déjà à cette date.' });
    next(err);
  }
};

/** DELETE /api/holidays/:id */
const remove = async (req, res, next) => {
  try {
    const r = await query('DELETE FROM holidays WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Jour férié introuvable.' });
    res.json({ message: 'Jour férié supprimé.' });
  } catch (err) { next(err); }
};

module.exports = { getAll, create, remove };
