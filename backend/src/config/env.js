/**
 * Chargement et validation des variables d'environnement.
 * En production, le démarrage est refusé si un secret est absent, trop court
 * ou égal à une valeur d'exemple de la documentation.
 */
require('dotenv').config();
const { parseOrigins } = require('../utils/origins');

const EXAMPLE_VALUES = [
  'votre_secret_jwt_tres_long_min_32_caracteres',
  'GENERER_UN_SECRET_64_CHARS_MINIMUM',
  'GENERER_UN_AUTRE_SECRET_64_CHARS',
  'votre_mot_de_passe',
  'MOT_DE_PASSE_FORT',
  'postgres',
];

const isProduction = process.env.NODE_ENV === 'production';

const problems = [];
const checkSecret = (name, minLength) => {
  const value = process.env[name];
  if (!value) problems.push(`${name} est absent`);
  else if (EXAMPLE_VALUES.includes(value)) problems.push(`${name} utilise une valeur d'exemple`);
  else if (value.length < minLength) problems.push(`${name} doit contenir au moins ${minLength} caractères`);
};

checkSecret('JWT_SECRET', 32);
checkSecret('LICENSE_SECRET', 32);
checkSecret('DB_PASSWORD', isProduction ? 12 : 1);
if (process.env.WA_ENABLED === 'true') {
  if (!process.env.WA_TOKEN)    problems.push('WA_TOKEN est requis quand WA_ENABLED=true');
  if (!process.env.WA_PHONE_ID) problems.push('WA_PHONE_ID est requis quand WA_ENABLED=true');
}

if (problems.length) {
  const message = `Configuration invalide :\n  - ${problems.join('\n  - ')}`;
  if (isProduction) {
    console.error(`❌ ${message}`);
    process.exit(1);
  }
  console.warn(`⚠️  ${message}\n   (toléré hors production)`);
}

module.exports = {
  isProduction,
  jwtSecret:      process.env.JWT_SECRET,
  jwtExpiresIn:   process.env.JWT_EXPIRES_IN || '8h',
  licenseSecret:  process.env.LICENSE_SECRET,
  // Adresses de l'application (une ou plusieurs, séparées par des virgules ; voir utils/origins.js)
  frontendUrls:   parseOrigins(process.env.FRONTEND_URL || 'http://localhost:5173'),
  port:           parseInt(process.env.PORT || '5000', 10),
  // Nombre de proxys de confiance devant l'API (1 derrière Nginx)
  trustProxy:     process.env.TRUST_PROXY !== undefined ? parseInt(process.env.TRUST_PROXY, 10) : (isProduction ? 1 : 0),
  whatsapp: {
    enabled:     process.env.WA_ENABLED === 'true',
    phoneId:     process.env.WA_PHONE_ID,
    token:       process.env.WA_TOKEN,
    verifyToken: process.env.WA_VERIFY_TOKEN,
    appSecret:   process.env.WA_APP_SECRET,
  },
};
