const { query } = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM holidays ORDER BY date ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};
const create = async (req, res, next) => {
  try {
    const { name, date, recurring } = req.body;
    const r = await query(
      'INSERT INTO holidays (name, date, recurring) VALUES ($1,$2,$3) RETURNING *',
      [name, date, recurring || false]
    );
    res.status(201).json({ data: r.rows[0], message: 'Jour férié ajouté.' });
  } catch (err) { next(err); }
};
const remove = async (req, res, next) => {
  try {
    await query('DELETE FROM holidays WHERE id=$1', [req.params.id]);
    res.json({ message: 'Jour férié supprimé.' });
  } catch (err) { next(err); }
};
module.exports = { getAll, create, remove };
