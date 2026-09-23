const router = require('express').Router();
const c = require('../controllers/notifications.controller');
const { authenticate } = require('../middlewares/auth.middleware');
router.get('/',           authenticate, c.getMine);
router.patch('/:id/read', authenticate, c.markRead);
router.patch('/read-all', authenticate, c.markAllRead);
module.exports = router;
