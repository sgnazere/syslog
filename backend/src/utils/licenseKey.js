/**
 * Utilitaire de génération et validation des clés de licence SysLog
 *
 * Format : SL-XXXXXXXX-XXXXXXXX-XXXXXXXX
 *   - SL     : préfixe produit
 *   - Seg1   : 8 hex aléatoires
 *   - Seg2   : 8 hex aléatoires
 *   - Sig    : 8 premiers hex du HMAC-SHA256(seg1-seg2, LICENSE_SECRET)
 *
 * La signature cryptographique garantit qu'une clé ne peut pas être forgée
 * sans connaître le LICENSE_SECRET de l'instance.
 */

const crypto = require('crypto');

const { licenseSecret: SECRET } = require('../config/env');

/**
 * Génère une nouvelle clé de licence valide.
 * @returns {string} ex : "SL-A3F8D9B2-7C4E1F0A-8B2C4D6E"
 */
const generateKey = () => {
  const seg1 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const seg2 = crypto.randomBytes(4).toString('hex').toUpperCase();
  const sig   = crypto
    .createHmac('sha256', SECRET)
    .update(`${seg1}-${seg2}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();
  return `SL-${seg1}-${seg2}-${sig}`;
};

/**
 * Vérifie qu'une clé respecte le format et la signature HMAC.
 * @param {string} key
 * @returns {boolean}
 */
const validateKeyFormat = (key) => {
  if (!key || typeof key !== 'string' || !SECRET) return false;
  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 4 || parts[0] !== 'SL') return false;

  const [, seg1, seg2, sig] = parts;
  if (!/^[0-9A-F]{8}$/.test(seg1) || !/^[0-9A-F]{8}$/.test(seg2) || !/^[0-9A-F]{8}$/.test(sig)) return false;

  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(`${seg1}-${seg2}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase();

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
};

/**
 * Masque une clé pour l'affichage : SL-A3F8****-****F0A-8B2C4D6E
 * @param {string} key
 * @returns {string}
 */
const maskKey = (key) => {
  if (!key) return '';
  const parts = key.split('-');
  if (parts.length < 4) return key;
  return `${parts[0]}-${parts[1].slice(0,4)}****-****${parts[2].slice(-3)}-${parts[3]}`;
};

module.exports = { generateKey, validateKeyFormat, maskKey };
