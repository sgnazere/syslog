const router = require('express').Router();
const c = require('../controllers/requests.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const auth = [authenticate];

router.get('/',    ...auth, c.getAll);
router.get('/:id', ...auth, c.getById);

router.post('/', ...auth,
  body('employe_id').notEmpty().withMessage('Employé requis.'),
  body('commune_id').notEmpty().withMessage('Commune requise.'),
  body('date_deplacement').isDate().withMessage('Date invalide.'),
  body('heure_depart').notEmpty(),
  body('heure_retour').notEmpty(),
  body('objectif').notEmpty().withMessage('Objectif requis.'),
  validate,
  auditLog('CREATE_REQUEST', 'demande_deplacement'),
  c.create
);

// manager ou admin peut valider (avec ou sans affecter véhicule/chauffeur)
router.patch('/:id/validate',
  authenticate, authorize('manager', 'admin'),
  auditLog('VALIDATE_REQUEST', 'demande_deplacement'),
  c.validate
);

router.patch('/:id/reject',
  authenticate, authorize('manager', 'admin'),
  body('reason').optional().isString(),
  validate,
  auditLog('REJECT_REQUEST', 'demande_deplacement'),
  c.reject
);

// Clôture de mission : retour chauffeur + kilométrage
router.patch('/:id/complete',
  authenticate, authorize('manager', 'admin'),
  body('km_depart').optional().isInt({ min: 0 }),
  body('km_retour').optional().isInt({ min: 0 }),
  validate,
  auditLog('COMPLETE_MISSION', 'demande_deplacement'),
  c.complete
);

module.exports = router;
