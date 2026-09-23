const router = require('express').Router();
const c = require('../controllers/reports.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
router.get('/summary', authenticate, authorize('admin','manager','logistic'), c.summary);
module.exports = router;
