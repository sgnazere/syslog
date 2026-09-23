require('dotenv').config();
const { Pool } = require('pg');

const DEFAULT_DB_NAME = 'eclog';

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || DEFAULT_DB_NAME,
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le pool PostgreSQL:', err);
});

// Test au démarrage
pool.query('SELECT NOW()', (err) => {
  if (err) console.error('❌ PostgreSQL connexion échouée:', err.message);
  else     console.log('✅ PostgreSQL connecté');
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
