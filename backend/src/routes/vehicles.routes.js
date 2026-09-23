const router = require('express').Router();
const c = require('../controllers/vehicles.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');
const logistic = [authenticate, authorize('manager','admin')];
const all = [authenticate];
router.get('/', ...all, c.getAll);
router.get('/:id', ...all, c.getById);
router.post('/',  ...logistic,
  body('immatriculation').notEmpty(),
  body('marque').notEmpty(),
  body('modele').notEmpty(),
  body('type_vehicule').notEmpty(),
  body('capacite').isInt({min:1}),
  body('statut').optional().isIn(['disponible','en_mission','en_maintenance','hors_service']),
  body('energie').optional().isIn(['Diesel','Essence']),
  validate, auditLog('CREATE_VEHICLE','Vehicle'), c.create);
router.put('/:id', ...logistic, auditLog('UPDATE_VEHICLE','Vehicle'), c.update);
router.delete('/:id', authenticate, authorize('admin'), auditLog('DELETE_VEHICLE','Vehicle'), c.remove);
module.exports = router;
