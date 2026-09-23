const router = require('express').Router();
const c = require('../controllers/users.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const adminOnly    = [authenticate, authorize('admin')];
const managerPlus  = [authenticate, authorize('admin', 'manager')];

const userRules = [
  body('nom').trim().notEmpty().withMessage('Nom requis.'),
  body('prenom').trim().notEmpty().withMessage('Prénom requis.'),
  body('email').isEmail().withMessage('Email invalide.'),
  body('role').isIn(['admin', 'manager', 'user']).withMessage('Rôle invalide.'),
  validate,
];

// Liste des employés (pour les selects passagers) — accessible à tous les connectés
router.get('/employees', authenticate, c.getEmployees);

router.get('/',    ...adminOnly, c.getAll);
router.get('/:id', ...adminOnly, c.getById);

router.post('/',   ...adminOnly, ...userRules,
  body('password').isLength({ min: 6 }).withMessage('Mot de passe min 6 caractères.'),
  validate,
  auditLog('CREATE_USER', 'users'),
  c.create
);

router.put('/:id', ...adminOnly, ...userRules,
  auditLog('UPDATE_USER', 'users'),
  c.update
);

router.patch('/:id/toggle-active', ...adminOnly,
  auditLog('TOGGLE_ACTIVE', 'users'),
  c.toggleActive
);

router.put('/:id/reset-password', ...adminOnly,
  body('newPassword').isLength({ min: 6 }),
  validate,
  auditLog('RESET_PASSWORD', 'users'),
  c.resetPassword
);

module.exports = router;
