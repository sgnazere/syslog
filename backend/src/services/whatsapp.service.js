/**
 * Service WhatsApp — SysLog
 * API officielle Meta (WhatsApp Cloud API v18.0)
 *
 * Configuration (.env) : WA_ENABLED, WA_PHONE_ID, WA_TOKEN,
 * WA_VERIFY_TOKEN (webhook), WA_APP_SECRET (signature du webhook).
 */
const axios = require('axios');
const { whatsapp, isProduction } = require('../config/env');

const apiUrl = () => `https://graph.facebook.com/v18.0/${whatsapp.phoneId}/messages`;

const log = (level, msg, data) => {
  const prefix = `[WhatsApp ${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, msg, data || '');
  else if (!isProduction) console.log(prefix, msg, data || '');
};

/** Masque un numéro pour les journaux : 2250700****89 */
const maskPhone = (phone) => String(phone).replace(/^(\d{6})\d+(\d{2})$/, '$1****$2');

/**
 * Normalise un numéro ivoirien au format international sans « + ».
 * Depuis 2021 les numéros comptent 10 chiffres (ex. 07 00 00 00 00 → 2250700000000).
 * Formats acceptés : 0700000000, 07 00 00 00 00, +225 07 00 00 00 00, 002250700000000.
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  let n = String(phone).replace(/[\s\-().]/g, '');
  if (n.startsWith('+'))  n = n.slice(1);
  if (n.startsWith('00')) n = n.slice(2);
  if (/^\d{10}$/.test(n)) n = `225${n}`;
  return /^225\d{10}$/.test(n) ? n : null;
};

/** Formate une date (objet Date ou chaîne AAAA-MM-JJ) en français. */
const formatDate = (value, options = { weekday: 'long', day: '2-digit', month: 'long' }) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('fr-FR', options);
};

const post = async (phone, payload) => {
  try {
    const res = await axios.post(apiUrl(), { messaging_product: 'whatsapp', to: phone, ...payload }, {
      headers: { Authorization: `Bearer ${whatsapp.token}`, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    log('info', `Message envoyé → ${maskPhone(phone)}`, res.data?.messages?.[0]?.id);
    return { ok: true, id: res.data?.messages?.[0]?.id };
  } catch (err) {
    const error = err.response?.data?.error?.message || err.message;
    log('error', `Échec envoi → ${maskPhone(phone)} :`, error);
    return { ok: false, error };
  }
};

/** Message texte libre (possible uniquement dans une fenêtre de conversation de 24 h). */
const sendText = async (to, text) => {
  if (!whatsapp.enabled) return { ok: false, error: 'WhatsApp est désactivé (WA_ENABLED).' };
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: 'Numéro invalide.' };
  return post(phone, { recipient_type: 'individual', type: 'text', text: { preview_url: false, body: text } });
};

/** Message modèle (doit être approuvé dans Meta Business Manager). */
const sendTemplate = async (to, templateName, components = []) => {
  if (!whatsapp.enabled) return { ok: false, error: 'WhatsApp est désactivé (WA_ENABLED).' };
  const phone = normalizePhone(to);
  if (!phone) {
    log('warn', 'Numéro invalide ignoré');
    return { ok: false, error: 'Numéro invalide.' };
  }
  return post(phone, { type: 'template', template: { name: templateName, language: { code: 'fr' }, components } });
};

const bodyParams = (...values) => [{
  type: 'body',
  parameters: values.map(v => ({ type: 'text', text: String(v ?? '') || '—' })),
}];

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS MÉTIER (modèles à créer dans Meta Business Manager)
// ════════════════════════════════════════════════════════════

/** « sortie_validee » : initiateur + passagers. */
const notifyDemandeValidee = async ({ employe_name, telephone, communes, date, vehicule, chauffeur, passagers = [] }) => {
  const recipients = [{ name: employe_name, telephone }, ...passagers].filter(p => p.telephone);
  await Promise.allSettled(recipients.map(p => sendTemplate(p.telephone, 'sortie_validee', bodyParams(
    p.name, communes.join(' & '), formatDate(date), vehicule || 'À définir',
    chauffeur?.nom || 'À définir', chauffeur?.telephone || '',
  ))));
};

/** « mission_chauffeur » : chauffeur affecté. */
const notifyChauffeurMission = ({ chauffeur_nom, telephone, date, communes, heure_depart, contact_initiateur }) =>
  sendTemplate(telephone, 'mission_chauffeur', bodyParams(
    chauffeur_nom, formatDate(date), communes.join(' & '), heure_depart, contact_initiateur,
  ));

/** « sortie_refusee » : initiateur. */
const notifyDemandeRefusee = ({ employe_name, telephone, communes, date, motif }) =>
  sendTemplate(telephone, 'sortie_refusee', bodyParams(
    employe_name, communes.join(' & '), formatDate(date), motif || 'Non précisé',
  ));

/** « mission_cloturee » : initiateur. */
const notifyMissionCloturee = ({ employe_name, telephone, communes, date, distance }) =>
  sendTemplate(telephone, 'mission_cloturee', bodyParams(
    employe_name, communes.join(' & '), formatDate(date, {}), distance != null ? distance : 'N/A',
  ));

module.exports = {
  normalizePhone,
  formatDate,
  maskPhone,
  sendText,
  sendTemplate,
  notifyDemandeValidee,
  notifyChauffeurMission,
  notifyDemandeRefusee,
  notifyMissionCloturee,
};
