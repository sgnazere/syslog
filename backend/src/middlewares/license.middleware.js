const { getLicenseFromDB } = require('../controllers/license.controller');

/**
 * Middleware de validation de licence.
 * Bloque toutes les requêtes si la licence est absente, expirée ou suspendue.
 * Les routes publiques (/api/auth/login, /health) sont exemptées.
 */
const checkLicense = async (req, res, next) => {
  try {
    // Routes exemptes de vérification
    const exemptPaths = [
      '/api/auth/login',
      '/api/auth/change-password',
      '/api/license',       // permettre l'accès à la page licence même si expirée
      '/health',
    ];
    if (exemptPaths.some(p => req.path.startsWith(p))) return next();

    const licence = await getLicenseFromDB();

    if (!licence) {
      return res.status(403).json({
        error:   'Système non licencié. Contactez votre administrateur.',
        code:    'NO_LICENSE',
        redirect: '/license',
      });
    }

    const today        = new Date().toISOString().split('T')[0];
    const isExpired    = licence.date_expiration < today;
    const isSuspended  = licence.statut === 'suspendue';

    if (isExpired || licence.statut === 'expiree') {
      return res.status(403).json({
        error:          'Licence expirée. Veuillez renouveler votre licence.',
        code:           'LICENSE_EXPIRED',
        date_expiration: licence.date_expiration,
        redirect:        '/license',
      });
    }

    if (isSuspended) {
      return res.status(403).json({
        error:    'Licence suspendue. Contactez votre administrateur.',
        code:     'LICENSE_SUSPENDED',
        redirect: '/license',
      });
    }

    // Attacher la licence à la requête pour usage en aval
    req.licence = licence;
    next();
  } catch (err) {
    // En cas d'erreur DB sur la vérification, on laisse passer (fail open)
    // pour ne pas bloquer les admins qui essaient de corriger la situation
    console.error('[licence] Erreur vérification licence:', err.message);
    next();
  }
};

module.exports = { checkLicense };
