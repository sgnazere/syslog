const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/maintenance.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');

const managerPlus = [authenticate, authorize('manager', 'admin')];
const idParam     = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');
const optional    = { values: 'falsy' };

const dossierRules = [
  body('type_maintenance').isString().trim().notEmpty().isLength({ max: 100 }).withMessage('Type requis.'),
  body('date_debut').isDate().withMessage('Date de début invalide.'),
  body('date_fin').optional(optional).isDate().withMessage('Date de fin invalide.'),
  body('cout').optional(optional).isFloat({ min: 0 }).withMessage('Coût invalide.').toFloat(),
  body('description').optional(optional).isString().isLength({ max: 2000 }),
  body('statut').optional(optional).isIn(['planifiee', 'en_cours']).withMessage('Statut invalide.'),
];

router.get('/', ...managerPlus, c.getAll);

router.post('/', ...managerPlus,
  body('vehicule_id').isInt({ min: 1 }).withMessage('Véhicule requis.').toInt(),
  ...dossierRules, validate,
  auditLog('CREATE', 'maintenance'), c.create);

router.put('/:id', ...managerPlus, idParam, ...dossierRules, validate,
  auditLog('UPDATE', 'maintenance'), c.update);

router.patch('/:id/close', ...managerPlus, idParam,
  body('cout').optional(optional).isFloat({ min: 0 }).withMessage('Coût invalide.').toFloat(),
  body('description').optional(optional).isString().isLength({ max: 2000 }),
  body('next_statut').optional().isIn(['disponible', 'hors_service']).withMessage('Statut du véhicule invalide.'),
  validate,
  auditLog('CLOSE', 'maintenance'), c.close);

router.delete('/:id', authenticate, authorize('admin'), idParam, validate,
  auditLog('DELETE', 'maintenance'), c.remove);

module.exports = router;
