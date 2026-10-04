/**
 * Échappe les jokers de LIKE / ILIKE (%, _ et \) pour une recherche littérale.
 * PostgreSQL utilise \ comme caractère d'échappement par défaut.
 */
const escapeLike = (value) => String(value).replace(/[\\%_]/g, '\\$&');

module.exports = { escapeLike };
