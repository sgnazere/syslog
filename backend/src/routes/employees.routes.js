const router = require('express').Router();
const c = require('../controllers/employees.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const adminOnly = [authenticate, authorize('admin')];

// Validation employé
const employeeRules = [
  body('nom').trim().notEmpty().withMessage('Nom requis.'),
  body('prenoms').trim().notEmpty().withMessage('Prénoms requis.'),
  validate,
];

// Liste des employés - accessible à tous les connectés
router.get('/', authenticate, c.getAll);

// CRUD employés - admin uniquement
router.get('/:id', ...adminOnly, c.getById);
router.post('/', ...adminOnly, employeeRules, c.create);
router.put('/:id', ...adminOnly, employeeRules, c.update);
router.delete('/:id', ...adminOnly, c.remove);

module.exports = router;