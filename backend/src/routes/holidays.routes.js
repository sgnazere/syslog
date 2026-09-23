const router = require('express').Router();
const c = require('../controllers/holidays.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const admin = [authenticate, authorize('admin')];
router.get('/', authenticate, c.getAll);
router.post('/',      ...admin, c.create);
router.delete('/:id', ...admin, c.remove);
module.exports = router;
