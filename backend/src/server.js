const env      = require('./config/env');
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');
const { query } = require('./config/database');
const { fromPgError } = require('./utils/httpError');
const { checkLicense } = require('./middlewares/license.middleware');

const app = express();

// Derrière un reverse proxy (Nginx), req.ip doit refléter l'adresse réelle du client
app.set('trust proxy', env.trustProxy);

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.frontendUrl, credentials: true }));

// ── Parsers (le corps brut est conservé pour vérifier la signature du webhook Meta) ──
app.use(express.json({ limit: '1mb', verify: (req, res, buf) => { req.rawBody = buf; } }));
if (process.env.NODE_ENV !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// ── Rate limiting ─────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
}));

// Connexion : limite par couple (adresse IP, e-mail) pour ne pas bloquer toute l'organisation
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.email || '').toLowerCase()}`,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
}));

// ── Webhooks publics (hors licence) ───────────────────────────
app.use('/webhooks', require('./routes/webhooks.routes'));

// ── API ───────────────────────────────────────────────────────
app.use('/api', checkLicense);
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/license',       require('./routes/license.routes'));
app.use('/api/users',         require('./routes/users.routes'));
app.use('/api/employees',     require('./routes/employees.routes'));
app.use('/api/vehicles',      require('./routes/vehicles.routes'));
app.use('/api/drivers',       require('./routes/drivers.routes'));
app.use('/api/requests',      require('./routes/requests.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/holidays',      require('./routes/holidays.routes'));
app.use('/api/communes',      require('./routes/communes.routes'));
app.use('/api/maintenance',   require('./routes/maintenance.routes'));
app.use('/api/docs',          require('./routes/docs.routes'));
app.use('/api/whatsapp',      require('./routes/whatsapp.routes'));
app.use('/api/audit',         require('./routes/audit.routes'));

// ── Health check (vérifie aussi la base de données) ───────────
app.get('/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', database: 'ok', timestamp: new Date() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable', timestamp: new Date() });
  }
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée.' }));

// ── Gestion d'erreurs globale ────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Corps de requête JSON invalide.' });
  if (err.type === 'entity.too.large')    return res.status(413).json({ error: 'Requête trop volumineuse.' });

  const mapped = err.expose ? err : fromPgError(err);
  if (mapped) return res.status(mapped.status).json({ error: mapped.message, ...(mapped.code && { code: mapped.code }) });

  console.error(err.stack || err);
  res.status(500).json({ error: env.isProduction ? 'Erreur serveur interne.' : err.message });
});

if (require.main === module) {
  // File d'attente des connexions entrantes élargie pour les pics de trafic (défaut Node : 511)
  app.listen({ port: env.port, backlog: 2048 }, async () => {
    console.log(`🚀 Serveur démarré sur le port ${env.port}`);
    try {
      await query('SELECT 1');
      console.log('✅ PostgreSQL connecté');
    } catch (err) {
      console.error('❌ PostgreSQL connexion échouée:', err.message);
    }
  });
}

module.exports = app;
