const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/drivers.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');

const managers = [authenticate, authorize('manager', 'admin')];
const idParam  = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');

const driverRules = [
  body('nom').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('Nom requis.'),
  body('prenoms').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('Prénoms requis.'),
  body('numero_permis').isString().trim().notEmpty().isLength({ max: 50 }).withMessage('Numéro de permis requis.'),
  body('type_permis').isString().trim().notEmpty().isLength({ max: 20 }).withMessage('Catégorie de permis requise.'),
  body('date_expiration_permis').isDate().withMessage('Date d\'expiration invalide.'),
  body('telephone').optional({ values: 'falsy' }).isString().isLength({ max: 20 }),
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Email invalide.'),
  body('statut').optional({ values: 'falsy' }).isIn(['disponible', 'en_mission', 'indisponible']).withMessage('Statut invalide.'),
  validate,
];

router.get('/',       authenticate, c.getAll);
router.post('/',      ...managers, ...driverRules, auditLog('CREATE_DRIVER', 'Driver'), c.create);
router.put('/:id',    ...managers, idParam, ...driverRules, auditLog('UPDATE_DRIVER', 'Driver'), c.update);
router.delete('/:id', authenticate, authorize('admin'), idParam, validate, auditLog('DELETE_DRIVER', 'Driver'), c.remove);

module.exports = router;
