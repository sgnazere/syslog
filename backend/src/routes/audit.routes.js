const router = require('express').Router();
const c = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const adminOnly = [authenticate, authorize('admin')];

router.get('/',     ...adminOnly, c.getAll);
router.get('/meta', ...adminOnly, c.getMeta);

module.exports = router;
