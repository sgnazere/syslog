/**
 * Erreur HTTP métier : son message est toujours renvoyé au client.
 */
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code   = code;
    this.expose = true;
  }
}

/**
 * Traduit les erreurs PostgreSQL connues en erreurs HTTP compréhensibles.
 * Retourne null si l'erreur n'est pas reconnue.
 */
const fromPgError = (err) => {
  switch (err.code) {
    case 'P0001': return new HttpError(409, err.message);                                   // règle métier levée par un trigger
    case '23505': return new HttpError(409, 'Cette valeur existe déjà.');                   // unicité
    case '23503': return new HttpError(409, 'Opération impossible : cet élément est utilisé ailleurs.'); // clé étrangère
    case '23502': return new HttpError(422, 'Un champ obligatoire est manquant.');          // NOT NULL
    case '23514': return new HttpError(422, 'Valeur hors des limites autorisées.');         // CHECK
    case '22P02':                                                                            // enum / entier invalide
    case '22007':                                                                            // date invalide
    case '22008': return new HttpError(422, 'Format de donnée invalide.');
    default:      return null;
  }
};

module.exports = { HttpError, fromPgError };
