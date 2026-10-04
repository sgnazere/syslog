const router = require('express').Router();
const { param } = require('express-validator');
const c = require('../controllers/notifications.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');

router.get('/',           authenticate, c.getMine);
router.patch('/read-all', authenticate, c.markAllRead);
router.patch('/:id/read', authenticate, param('id').isInt({ min: 1 }), validate, c.markRead);

module.exports = router;
