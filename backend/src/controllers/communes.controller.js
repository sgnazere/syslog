require('dotenv').config();
const { query } = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM communes ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getDistricts = async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM districts ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getServices = async (req, res, next) => {
  try {
    const r = await query('SELECT id, nom FROM services ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) {
    // Table services absente → retourner liste vide plutôt qu'une erreur 500
    if (err.code === '42P01') return res.json({ data: [] });
    next(err);
  }
};

module.exports = { getAll, getDistricts, getServices };
