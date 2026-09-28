const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate, passwordRule } = require('../middlewares/validate.middleware');

const adminOnly = [authenticate, authorize('admin')];
const idParam   = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');

const userRules = [
  body('employee_id').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
  body('nom').optional().trim().isLength({ max: 100 }),
  body('prenom').optional().trim().isLength({ max: 100 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email invalide.'),
  body('role').isIn(['superadmin', 'admin', 'manager', 'user']).withMessage('Rôle invalide.'),
  body('is_active').optional().isBoolean().toBoolean(),
];

// Liste minimale des employés actifs (listes de sélection) — tous les connectés
router.get('/employees', authenticate, c.getEmployees);

router.get('/',    ...adminOnly, c.getAll);
router.get('/:id', ...adminOnly, idParam, validate, c.getById);

router.post('/', ...adminOnly, ...userRules, passwordRule('password'), validate,
  auditLog('CREATE_USER', 'users'), c.create);

router.put('/:id', ...adminOnly, idParam, ...userRules, validate,
  auditLog('UPDATE_USER', 'users'), c.update);

router.patch('/:id/toggle-active', ...adminOnly, idParam, validate,
  auditLog('TOGGLE_ACTIVE', 'users'), c.toggleActive);

router.put('/:id/reset-password', ...adminOnly, idParam, passwordRule('newPassword'), validate,
  auditLog('RESET_PASSWORD', 'users'), c.resetPassword);

module.exports = router;
