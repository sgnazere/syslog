const router = require('express').Router();
const { login, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

router.post('/login',
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
  validate, login);
router.get('/me', authenticate, me);
router.put('/change-password', authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('Minimum 6 caractères.'),
  validate, changePassword);

module.exports = router;
