/**
 * Applique les migrations SQL de backend/migrations dans l'ordre alphabétique.
 * Chaque fichier est exécuté une seule fois, dans une transaction, et tracé
 * dans la table schema_migrations.
 *
 * Usage : npm run migrate            (applique les migrations en attente)
 *         npm run migrate -- --status (liste l'état sans rien appliquer)
 */
const fs   = require('fs');
const path = require('path');
require('../src/config/env');
const { Pool } = require('pg');

// Les migrations créent et modifient des tables : elles utilisent le compte propriétaire
// (DB_MIGRATION_USER), distinct du compte applicatif aux droits limités (DB_USER).
const pool = new Pool({
  host:     process.env.DB_HOST || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'eclog',
  user:     process.env.DB_MIGRATION_USER || process.env.DB_USER,
  password: process.env.DB_MIGRATION_PASSWORD || process.env.DB_PASSWORD,
});

const DIR = path.join(__dirname, '..', 'migrations');

(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )`);
    const applied = new Set((await client.query('SELECT version FROM schema_migrations')).rows.map(r => r.version));
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();

    if (process.argv.includes('--status')) {
      files.forEach(f => console.log(`${applied.has(f) ? '✓' : '·'} ${f}`));
      return;
    }

    const pending = files.filter(f => !applied.has(f));
    if (!pending.length) {
      console.log('Base à jour, aucune migration en attente.');
      return;
    }
    for (const file of pending) {
      process.stdout.write(`→ ${file} … `);
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(DIR, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('ÉCHEC');
        throw err;
      }
    }
    console.log(`${pending.length} migration(s) appliquée(s).`);
  } catch (err) {
    console.error('❌', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
