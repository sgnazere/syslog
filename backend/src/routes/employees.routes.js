const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/employees.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { auditLog } = require('../middlewares/audit.middleware');

const adminOnly   = [authenticate, authorize('admin')];
const managerPlus = [authenticate, authorize('admin', 'manager')];
const idParam     = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');
const optional    = { values: 'falsy' };

const employeeRules = [
  body('nom').trim().notEmpty().isLength({ max: 100 }).withMessage('Nom requis.'),
  body('prenoms').trim().notEmpty().isLength({ max: 100 }).withMessage('Prénoms requis.'),
  body('email').optional(optional).isEmail().withMessage('Email invalide.'),
  body('date_naissance').optional(optional).isDate().withMessage('Date de naissance invalide.'),
  body('date_embauche').optional(optional).isDate().withMessage('Date d\'embauche invalide.'),
  body('service_id').optional(optional).isInt({ min: 1 }).toInt(),
  body(['poste', 'projet', 'type_contrat']).optional(optional).isString().isLength({ max: 100 }),
  body(['telephone', 'numero_secu', 'numero_urgence']).optional(optional).isString().isLength({ max: 20 }),
  body('status').optional(optional).isIn(['actif', 'inactif']).withMessage('Statut invalide.'),
  validate,
];

// Données RH : réservées aux administrateurs et managers
router.get('/',    ...managerPlus, c.getAll);
router.get('/:id', ...adminOnly, idParam, validate, c.getById);
router.post('/',   ...adminOnly, ...employeeRules, auditLog('CREATE_EMPLOYEE', 'employees'), c.create);
router.put('/:id', ...adminOnly, idParam, ...employeeRules, auditLog('UPDATE_EMPLOYEE', 'employees'), c.update);
router.delete('/:id', ...adminOnly, idParam, validate, auditLog('DELETE_EMPLOYEE', 'employees'), c.remove);

module.exports = router;
