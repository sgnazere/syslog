const router = require('express').Router();
const c      = require('../controllers/license.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const adminOnly = [authenticate, authorize('admin')];

router.get('/',                    ...adminOnly, c.getInfo);
router.post('/generate',           ...adminOnly, c.generate);
router.post('/activate',           ...adminOnly, c.activate);
router.patch('/:id/status',        ...adminOnly, c.toggleStatus);
router.get('/sessions',            ...adminOnly, c.getSessions);
router.delete('/sessions/:id',     ...adminOnly, c.killSession);

module.exports = router;
