/**
 * Webhook WhatsApp (Meta)
 * GET  /webhooks/whatsapp — Vérification initiale par Meta
 * POST /webhooks/whatsapp — Réception des statuts de livraison
 */
const router = require('express').Router();

const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'syslog_webhook_token';

// ── Vérification initiale du webhook (Meta envoie un GET) ─────
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Vérification réussie');
    return res.status(200).send(challenge);
  }
  res.status(403).json({ error: 'Token de vérification invalide.' });
});

// ── Réception des événements Meta (statuts, messages entrants) ─
router.post('/whatsapp', (req, res) => {
  const body = req.body;

  if (body?.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        const value = change.value;

        // Statuts de livraison
        const statuses = value?.statuses || [];
        for (const status of statuses) {
          console.log(`[WhatsApp] Statut message ${status.id}: ${status.status} → ${status.recipient_id}`);
          // Ici : mettre à jour le statut dans la table notifications si nécessaire
        }

        // Messages entrants (réponses des utilisateurs)
        const messages = value?.messages || [];
        for (const msg of messages) {
          console.log(`[WhatsApp] Message reçu de ${msg.from}: ${msg.text?.body || msg.type}`);
          // Ici : traiter les réponses si nécessaire (ex. confirmation de mission)
        }
      }
    }
    return res.status(200).json({ status: 'EVENT_RECEIVED' });
  }

  res.status(404).json({ error: 'Événement non reconnu.' });
});

// ── Test d'envoi (admin uniquement) ───────────────────────────
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const wa = require('../services/whatsapp.service');

router.post('/whatsapp/test',
  authenticate, authorize('admin'),
  async (req, res, next) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message)
        return res.status(400).json({ error: 'Numéro et message requis.' });

      const normalized = wa.normalizePhone(phone);
      if (!normalized)
        return res.status(400).json({ error: `Numéro invalide : ${phone}. Format attendu : +225XXXXXXXX` });

      await wa.sendText(normalized, message);
      res.json({ message: `Message envoyé à +${normalized}`, to: `+${normalized}` });
    } catch (err) { next(err); }
  }
);

module.exports = router;
