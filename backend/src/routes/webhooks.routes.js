/**
 * Webhook WhatsApp (Meta) — routes publiques
 * GET  /webhooks/whatsapp — vérification initiale par Meta
 * POST /webhooks/whatsapp — statuts de livraison et messages entrants
 */
const crypto = require('crypto');
const router = require('express').Router();
const { whatsapp } = require('../config/env');
const { maskPhone } = require('../services/whatsapp.service');

/** Vérifie l'en-tête X-Hub-Signature-256 (HMAC-SHA256 du corps brut avec l'App Secret Meta). */
const hasValidSignature = (req) => {
  const signature = req.headers['x-hub-signature-256'];
  if (!whatsapp.appSecret || !signature || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', whatsapp.appSecret).update(req.rawBody).digest('hex');
  return signature.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Meta envoie un challenge numérique : tout autre contenu est refusé et la réponse est
  // en texte brut (jamais interprétée comme HTML par le navigateur)
  if (whatsapp.verifyToken && mode === 'subscribe' && token === whatsapp.verifyToken
      && /^\d{1,64}$/.test(String(challenge))) {
    return res.status(200).type('text/plain').send(String(challenge));
  }
  res.status(403).json({ error: 'Token de vérification invalide.' });
});

router.post('/whatsapp', (req, res) => {
  if (!hasValidSignature(req)) return res.status(401).json({ error: 'Signature invalide.' });

  const body = req.body;
  if (body?.object !== 'whatsapp_business_account') {
    return res.status(404).json({ error: 'Événement non reconnu.' });
  }
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      for (const status of change.value?.statuses || []) {
        console.log(`[WhatsApp] Statut ${status.status} → ${maskPhone(status.recipient_id)}`);
      }
      for (const msg of change.value?.messages || []) {
        console.log(`[WhatsApp] Message entrant (${msg.type}) de ${maskPhone(msg.from)}`);
      }
    }
  }
  res.status(200).json({ status: 'EVENT_RECEIVED' });
});

module.exports = router;
