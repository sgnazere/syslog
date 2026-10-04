const router = require('express').Router();
const { body, param } = require('express-validator');
const c      = require('../controllers/license.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { auditLog } = require('../middlewares/audit.middleware');

const adminOnly  = [authenticate, authorize('admin')];
// Émission et suspension des licences : super-administrateur (éditeur) uniquement
const superAdmin = [authenticate, authorize('superadmin')];
const idParam   = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');

router.get('/', ...adminOnly, c.getInfo);

router.post('/generate', ...superAdmin,
  body('organisation').trim().notEmpty().isLength({ max: 200 }).withMessage('Organisation requise.'),
  body('date_expiration').isDate().withMessage('Date d\'expiration invalide.'),
  body('contact').optional({ values: 'falsy' }).isString().isLength({ max: 150 }),
  body('max_utilisateurs').optional().isInt({ min: 1, max: 100000 }).toInt(),
  body('max_connexions').optional().isInt({ min: 1, max: 100000 }).toInt(),
  body('modules').optional().isString().isLength({ max: 200 }),
  body('notes').optional({ values: 'falsy' }).isString().isLength({ max: 2000 }),
  validate,
  auditLog('GENERATE_LICENSE', 'licence'),
  c.generate);

router.post('/activate', ...adminOnly,
  body('cle').isString().notEmpty().withMessage('Clé de licence requise.'),
  validate,
  auditLog('ACTIVATE_LICENSE', 'licence'),
  c.activate);

router.patch('/:id/status', ...superAdmin, idParam,
  body('statut').isIn(['active', 'suspendue']).withMessage('Statut invalide.'),
  validate,
  auditLog('CHANGE_LICENSE_STATUS', 'licence'),
  c.toggleStatus);

router.get('/sessions', ...adminOnly, c.getSessions);
router.delete('/sessions/:id', ...adminOnly, idParam, validate,
  auditLog('KILL_SESSION', 'session'),
  c.killSession);

module.exports = router;
