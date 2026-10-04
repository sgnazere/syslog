const { query } = require('../config/database');

const getAll = async (req, res, next) => {
  try {
    const r = await query('SELECT id, nom FROM communes ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getDistricts = async (req, res, next) => {
  try {
    const r = await query('SELECT id, nom FROM districts ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

const getServices = async (req, res, next) => {
  try {
    const r = await query('SELECT id, nom FROM services ORDER BY nom ASC');
    res.json({ data: r.rows });
  } catch (err) { next(err); }
};

module.exports = { getAll, getDistricts, getServices };
