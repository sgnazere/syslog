require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' },
});
app.use('/api/auth/login', authLimiter);

// ── Parsers ───────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Middleware de licence (après auth, avant les routes métier) ──
const { checkLicense } = require('./middlewares/license.middleware');
app.use('/api', checkLicense);

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/license',       require('./routes/license.routes'));
app.use('/api/users',          require('./routes/users.routes'));
app.use('/api/employees',     require('./routes/employees.routes'));
app.use('/api/vehicles',      require('./routes/vehicles.routes'));
app.use('/api/drivers',       require('./routes/drivers.routes'));
app.use('/api/requests',      require('./routes/requests.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/reports',       require('./routes/reports.routes'));
app.use('/api/holidays',      require('./routes/holidays.routes'));
app.use('/api/communes',  require('./routes/communes.routes'));
app.use('/api/maintenance',   require('./routes/maintenance.routes'));
app.use('/api/docs',          require('./routes/docs.routes'));
app.use('/webhooks',          require('./routes/webhooks.routes'));
app.use('/api/whatsapp',      require('./routes/webhooks.routes')); // test endpoint
app.use('/api/audit',         require('./routes/audit.routes'));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route non trouvée.' }));

// ── Gestion d'erreurs globale ────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erreur serveur interne.'
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Serveur démarré sur le port ${PORT}`));
