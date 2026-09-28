const router = require('express').Router();
const { body } = require('express-validator');
const { login, logout, me, changePassword } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate, passwordRule } = require('../middlewares/validate.middleware');
const { auditLog } = require('../middlewares/audit.middleware');

router.post('/login',
  body('email').isEmail().withMessage('Email invalide.'),
  body('password').isString().notEmpty().withMessage('Mot de passe requis.'),
  validate, login);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);

router.put('/change-password', authenticate,
  body('currentPassword').isString().notEmpty().withMessage('Mot de passe actuel requis.'),
  passwordRule('newPassword'),
  validate,
  auditLog('CHANGE_PASSWORD', 'users'),
  changePassword);

module.exports = router;
