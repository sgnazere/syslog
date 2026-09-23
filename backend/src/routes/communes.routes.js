const router = require('express').Router();
const { getAll, getDistricts, getServices } = require('../controllers/communes.controller');
const { authenticate } = require('../middlewares/auth.middleware');
router.get('/', authenticate, getAll);
router.get('/districts', authenticate, getDistricts);
router.get('/services', authenticate, getServices);
module.exports = router;
