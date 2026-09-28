/**
 * Masque récursivement les champs sensibles d'un objet avant journalisation.
 */
const SENSITIVE_KEYS = /^(password|newpassword|currentpassword|cle|token|secret|numero_secu|.*_secret|.*_token)$/i;

const MASK = '[masqué]';

const redact = (value, depth = 0) => {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
  const out = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = SENSITIVE_KEYS.test(key) ? MASK : redact(v, depth + 1);
  }
  return out;
};

module.exports = { redact, MASK };
