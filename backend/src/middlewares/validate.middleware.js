const { validationResult, body } = require('express-validator');

/**
 * À placer après les règles express-validator.
 * Retourne 422 avec les erreurs si validation échoue.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Données invalides.',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/** Politique de mot de passe : 10 caractères minimum, au moins une lettre et un chiffre. */
const PASSWORD_MIN_LENGTH = 10;
const passwordRule = (field) => body(field)
  .isString()
  .isLength({ min: PASSWORD_MIN_LENGTH, max: 128 })
  .withMessage(`Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères.`)
  .matches(/[A-Za-z]/).withMessage('Le mot de passe doit contenir au moins une lettre.')
  .matches(/\d/).withMessage('Le mot de passe doit contenir au moins un chiffre.');

module.exports = { validate, passwordRule, PASSWORD_MIN_LENGTH };
