const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/holidays.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');

const admin = [authenticate, authorize('admin')];

router.get('/', authenticate, c.getAll);
router.post('/', ...admin,
  body('name').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('Libellé requis.'),
  body('date').isDate().withMessage('Date invalide.'),
  body('recurring').optional().isBoolean().toBoolean(),
  validate,
  auditLog('CREATE_HOLIDAY', 'holidays'), c.create);
router.delete('/:id', ...admin,
  param('id').isInt({ min: 1 }), validate,
  auditLog('DELETE_HOLIDAY', 'holidays'), c.remove);

module.exports = router;
