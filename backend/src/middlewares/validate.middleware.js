const { validationResult } = require('express-validator');

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

module.exports = { validate };
