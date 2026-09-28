/**
 * Administration WhatsApp — /api/whatsapp (admin)
 */
const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { whatsapp } = require('../config/env');
const wa = require('../services/whatsapp.service');

const adminOnly = [authenticate, authorize('admin')];

/** GET /api/whatsapp/status — état de la configuration (sans secret) */
router.get('/status', ...adminOnly, (req, res) => {
  res.json({
    data: {
      enabled:          whatsapp.enabled,
      phone_configured: !!whatsapp.phoneId,
      token_configured: !!whatsapp.token,
      webhook_verify:   !!whatsapp.verifyToken,
      webhook_signature:!!whatsapp.appSecret,
    },
  });
});

/** POST /api/whatsapp/test — envoi d'un message texte de test */
router.post('/test', ...adminOnly,
  body('phone').isString().notEmpty().withMessage('Numéro requis.'),
  body('message').isString().trim().notEmpty().isLength({ max: 1000 }).withMessage('Message requis.'),
  validate,
  async (req, res, next) => {
    try {
      const normalized = wa.normalizePhone(req.body.phone);
      if (!normalized)
        return res.status(400).json({ error: 'Numéro invalide. Format attendu : 07 00 00 00 00 ou +225 07 00 00 00 00.' });

      const result = await wa.sendText(normalized, req.body.message);
      if (!result.ok) return res.status(502).json({ error: `Échec de l'envoi : ${result.error}` });
      res.json({ message: `Message envoyé à +${normalized}`, to: `+${normalized}` });
    } catch (err) { next(err); }
  }
);

module.exports = router;
