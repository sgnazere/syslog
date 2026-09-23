const { query } = require('../config/database');

/** GET /api/reports/summary?from=&to= */
const summary = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = from && to
      ? `AND trip_date BETWEEN '${from}' AND '${to}'`
      : '';
    const [total, byStatus, byCommune, byVehicle] = await Promise.all([
      query(`SELECT COUNT(*) FROM vehicle_requests WHERE 1=1 ${dateFilter}`),
      query(`SELECT status, COUNT(*) FROM vehicle_requests WHERE 1=1 ${dateFilter} GROUP BY status`),
      query(`SELECT commune, COUNT(*) FROM vehicle_requests WHERE 1=1 ${dateFilter} GROUP BY commune ORDER BY count DESC`),
      query(`SELECT v.brand, v.model, v.plate, COUNT(vr.id) as trips
             FROM vehicles v LEFT JOIN vehicle_requests vr ON vr.vehicle_id=v.id
             WHERE 1=1 ${dateFilter.replace('trip_date','vr.trip_date')}
             GROUP BY v.id ORDER BY trips DESC`),
    ]);
    res.json({
      data: {
        total:     parseInt(total.rows[0].count),
        byStatus:  byStatus.rows,
        byCommune: byCommune.rows,
        byVehicle: byVehicle.rows,
      },
    });
  } catch (err) { next(err); }
};

module.exports = { summary };
