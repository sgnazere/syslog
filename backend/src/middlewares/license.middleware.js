const { getLicenseFromDB } = require('../controllers/license.controller');

/**
 * Chemin complet de la requête, indépendamment du point de montage
 * (dans un middleware monté sur '/api', req.path ne contient pas '/api').
 */
const fullPath = (req) => req.baseUrl + req.path;

// Routes accessibles même sans licence valide : authentification et gestion de la licence
const isExempt = (path) =>
  path.startsWith('/api/auth/') || path === '/api/license' || path.startsWith('/api/license/');

/**
 * Bloque les requêtes /api si la licence est absente, expirée ou suspendue.
 */
const checkLicense = async (req, res, next) => {
  if (isExempt(fullPath(req))) return next();

  let licence;
  try {
    licence = await getLicenseFromDB();
  } catch (err) {
    console.error('[licence] Vérification impossible :', err.message);
    return res.status(503).json({ error: 'Service temporairement indisponible.' });
  }

  if (!licence) {
    return res.status(403).json({
      error: 'Système non licencié. Contactez votre administrateur.',
      code: 'NO_LICENSE', redirect: '/license',
    });
  }
  if (licence.is_expired || licence.statut === 'expiree') {
    return res.status(403).json({
      error: 'Licence expirée. Veuillez renouveler votre licence.',
      code: 'LICENSE_EXPIRED', date_expiration: licence.date_expiration, redirect: '/license',
    });
  }
  if (licence.statut === 'suspendue') {
    return res.status(403).json({
      error: 'Licence suspendue. Contactez votre administrateur.',
      code: 'LICENSE_SUSPENDED', redirect: '/license',
    });
  }

  req.licence = licence;
  next();
};

module.exports = { checkLicense, isExempt };
