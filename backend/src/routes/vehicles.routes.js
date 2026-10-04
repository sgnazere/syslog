const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/vehicles.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');

const managers = [authenticate, authorize('manager', 'admin')];
const idParam  = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');

const vehicleRules = [
  body('immatriculation').isString().trim().notEmpty().isLength({ max: 20 }).withMessage('Immatriculation requise.'),
  body('marque').isString().trim().notEmpty().isLength({ max: 50 }).withMessage('Marque requise.'),
  body('modele').isString().trim().notEmpty().isLength({ max: 50 }).withMessage('Modèle requis.'),
  body('type_vehicule').isString().trim().notEmpty().isLength({ max: 50 }).withMessage('Type requis.'),
  body('capacite').isInt({ min: 1, max: 100 }).withMessage('Capacité invalide.').toInt(),
  body('kilometrage').optional({ values: 'falsy' }).isInt({ min: 0 }).toInt(),
  body('annee_mise_service').optional({ values: 'falsy' }).isInt({ min: 1950, max: 2100 }).toInt(),
  body('statut').optional().isIn(['disponible', 'en_mission', 'en_maintenance', 'hors_service']).withMessage('Statut invalide.'),
  body('energie').optional().isIn(['Diesel', 'Essence']).withMessage('Énergie invalide.'),
  validate,
];

router.get('/',    authenticate, c.getAll);
router.get('/:id', authenticate, idParam, validate, c.getById);
router.post('/',   ...managers, ...vehicleRules, auditLog('CREATE_VEHICLE', 'Vehicle'), c.create);
router.put('/:id', ...managers, idParam, ...vehicleRules, auditLog('UPDATE_VEHICLE', 'Vehicle'), c.update);
router.delete('/:id', authenticate, authorize('admin'), idParam, validate, auditLog('DELETE_VEHICLE', 'Vehicle'), c.remove);

module.exports = router;
