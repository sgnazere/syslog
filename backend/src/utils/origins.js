/**
 * Adresses (origines) autorisées à utiliser l'application depuis un navigateur.
 *
 * FRONTEND_URL accepte une ou plusieurs adresses séparées par des virgules :
 *   FRONTEND_URL=https://syslog.espaceconfiance.ci,https://www.syslog.espaceconfiance.ci
 * Un joker est possible pour les sous-domaines (ex. tunnels VS Code) :
 *   FRONTEND_URL=http://localhost:5173,https://*.devtunnels.ms
 * Le joker ne couvre que les sous-domaines du domaine indiqué, avec le même protocole.
 */
const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

const matches = (origin, allowed) => {
  if (origin === allowed) return true;
  const wildcard = allowed.match(/^(https?):\/\/\*\.([a-z0-9.-]+)$/i);
  if (!wildcard) return false;
  const [, protocol, domain] = wildcard;
  const m = origin.match(/^(https?):\/\/([a-z0-9.-]+)$/i);
  return !!m && m[1].toLowerCase() === protocol.toLowerCase()
    && m[2].toLowerCase().endsWith(`.${domain.toLowerCase()}`);
};

/** Crée la fonction de contrôle à partir de la liste d'origines autorisées. */
const originChecker = (allowedList) => (origin) =>
  !!origin && allowedList.some(allowed => matches(origin, allowed));

module.exports = { parseOrigins, originChecker };
