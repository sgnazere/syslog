const router = require('express').Router();
const { body, param } = require('express-validator');
const c = require('../controllers/requests.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { auditLog } = require('../middlewares/audit.middleware');
const { validate } = require('../middlewares/validate.middleware');

const managers = [authenticate, authorize('manager', 'admin')];
const idParam  = param('id').isInt({ min: 1 }).withMessage('Identifiant invalide.');
const TIME     = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// Compatibilité : accepte commune_id (une commune) ou commune_ids (plusieurs)
const normalizeCommunes = (req, res, next) => {
  if (req.body.commune_ids === undefined && req.body.commune_id !== undefined) {
    req.body.commune_ids = [req.body.commune_id];
  }
  next();
};

router.get('/',    authenticate, c.getAll);
router.get('/pending-actions', ...managers, c.pendingActions); // avant /:id
router.get('/:id', authenticate, idParam, validate, c.getById);

router.post('/', authenticate, normalizeCommunes,
  body('employe_id').isInt({ min: 1 }).withMessage('Employé requis.').toInt(),
  body('commune_ids').isArray({ min: 1, max: 20 }).withMessage('Au moins une commune est requise.'),
  body('commune_ids.*').isInt({ min: 1 }).toInt(),
  body('date_deplacement').isDate().withMessage('Date invalide.'),
  body('heure_depart').matches(TIME).withMessage('Heure de départ invalide.'),
  body('heure_retour').matches(TIME).withMessage('Heure de retour invalide.'),
  body('objectif').isString().trim().notEmpty().isLength({ max: 2000 }).withMessage('Objectif requis.'),
  body('passager_ids').optional().isArray({ max: 50 }),
  body('passager_ids.*').isInt({ min: 1 }).toInt(),
  validate,
  auditLog('CREATE_REQUEST', 'demande_deplacement'),
  c.create
);

router.patch('/:id/validate', ...managers, idParam,
  body('vehicule_id').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
  body('chauffeur_id').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
  validate,
  auditLog('VALIDATE_REQUEST', 'demande_deplacement'),
  c.validate
);

router.patch('/:id/reject', ...managers, idParam,
  body('reason').isString().trim().notEmpty().isLength({ max: 1000 }).withMessage('Motif du refus requis.'),
  validate,
  auditLog('REJECT_REQUEST', 'demande_deplacement'),
  c.reject
);

router.patch('/:id/complete', ...managers, idParam,
  body('km_depart').optional({ values: 'null' }).isInt({ min: 0 }).toInt(),
  body('km_retour').optional({ values: 'null' }).isInt({ min: 0 }).toInt(),
  validate,
  auditLog('COMPLETE_MISSION', 'demande_deplacement'),
  c.complete
);

module.exports = router;
