const jwt = require('jsonwebtoken');

/**
 * Vérifie le token JWT dans le header Authorization.
 * Ajoute req.user = { id, email, role, name } si valide.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expiré ou invalide.' });
  }
};

/**
 * Vérifie que l'utilisateur a l'un des rôles autorisés.
 * Usage : authorize('admin', 'manager')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: `Accès refusé. Rôles autorisés : ${roles.join(', ')}.`,
    });
  }
  next();
};

module.exports = { authenticate, authorize };
