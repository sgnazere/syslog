require('./env');
const { Pool, types } = require('pg');

// Les colonnes DATE sont renvoyées telles quelles ("AAAA-MM-JJ") et non converties
// en objet Date JavaScript, ce qui évite tout décalage de fuseau horaire.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'eclog',
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool PostgreSQL:', err.message);
});

const query = (text, params) => pool.query(text, params);

/**
 * Exécute `fn(client)` dans une transaction.
 * `client.query` a la même signature que `query`.
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, withTransaction };
