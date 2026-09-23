/**
 * Service WhatsApp — SysLog
 * API officielle Meta (WhatsApp Cloud API v18.0)
 *
 * Prérequis .env :
 *   WA_ENABLED=true
 *   WA_PHONE_ID=<PHONE_NUMBER_ID depuis Meta>
 *   WA_TOKEN=<Access Token permanent depuis Meta Business>
 *   WA_VERIFY_TOKEN=<token personnalisé pour vérification webhook>
 */

const axios = require('axios');

const WA_API_URL = `https://graph.facebook.com/v18.0/${process.env.WA_PHONE_ID}/messages`;
const WA_TOKEN   = process.env.WA_TOKEN;
const WA_ENABLED = process.env.WA_ENABLED === 'true';

// ── Logger interne ────────────────────────────────────────────
const log = (level, msg, data) => {
  const prefix = `[WhatsApp ${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, msg, data || '');
  else if (process.env.NODE_ENV !== 'production') console.log(prefix, msg, data || '');
};

// ── Normaliser un numéro ivoirien ─────────────────────────────
// Formats acceptés : +225 07 00 00 00 00 / 0700000000 / 07-00-00-00-00
const normalizePhone = (phone) => {
  if (!phone) return null;
  let n = phone.replace(/[\s\-().]/g, '');
  // Ajouter indicatif Côte d'Ivoire si absent
  if (n.startsWith('0') && n.length === 10) n = '225' + n.slice(1);
  if (n.startsWith('+')) n = n.slice(1);
  // Valider : doit commencer par 225 et avoir 11 chiffres
  if (!/^225\d{8}$/.test(n)) return null;
  return n;
};

// ── Envoi de message texte libre (sessions 24h uniquement) ────
const sendText = async (to, text) => {
  if (!WA_ENABLED) { log('info', 'Désactivé — message non envoyé à', to); return; }
  const phone = normalizePhone(to);
  if (!phone) { log('warn', 'Numéro invalide ignoré:', to); return; }

  try {
    const res = await axios.post(WA_API_URL, {
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to:                phone,
      type:              'text',
      text:              { preview_url: false, body: text },
    }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    log('info', `Message texte envoyé → ${phone}`, res.data?.messages?.[0]?.id);
    return res.data;
  } catch (err) {
    log('error', `Échec envoi → ${phone}:`, err.response?.data || err.message);
  }
};

// ── Envoi par template Meta (messages initiés par le business) ─
// Les noms de templates doivent être approuvés dans le Business Manager Meta
const sendTemplate = async (to, templateName, langCode, components = []) => {
  if (!WA_ENABLED) { log('info', 'Désactivé — template non envoyé à', to); return; }
  const phone = normalizePhone(to);
  if (!phone) { log('warn', 'Numéro invalide ignoré:', to); return; }

  try {
    const res = await axios.post(WA_API_URL, {
      messaging_product: 'whatsapp',
      to:                phone,
      type:              'template',
      template: {
        name:      templateName,
        language:  { code: langCode || 'fr' },
        components,
      },
    }, {
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    log('info', `Template "${templateName}" envoyé → ${phone}`, res.data?.messages?.[0]?.id);
    return res.data;
  } catch (err) {
    log('error', `Échec template "${templateName}" → ${phone}:`, err.response?.data || err.message);
  }
};

// ── Envoi à plusieurs destinataires ──────────────────────────
const sendBulk = async (phones, templateName, langCode, components) => {
  const results = await Promise.allSettled(
    phones.map(p => sendTemplate(p, templateName, langCode, components))
  );
  const success = results.filter(r => r.status === 'fulfilled' && r.value).length;
  log('info', `Bulk "${templateName}": ${success}/${phones.length} envoyés`);
  return { success, total: phones.length };
};

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS MÉTIER SYSLOG
// Templates à créer dans Meta Business Manager
// ════════════════════════════════════════════════════════════

/**
 * Notifie l'initiateur et les passagers : demande validée
 * Template : "sortie_validee"
 * Corps (à soumettre à Meta) :
 *   "Bonjour {{1}}, votre demande de sortie vers {{2}} le {{3}} a été
 *    validée ✅. Véhicule : {{4}}. Chauffeur : {{5}} ({{6}})."
 */
const notifyDemandeValidee = async ({ employe_name, telephone, communes, date, vehicule, chauffeur, passagers = [] }) => {
  const params = (name) => ([{
    type: 'body',
    parameters: [
      { type: 'text', text: name },
      { type: 'text', text: communes.join(' & ') },
      { type: 'text', text: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) },
      { type: 'text', text: vehicule || 'À définir' },
      { type: 'text', text: chauffeur?.nom || 'À définir' },
      { type: 'text', text: chauffeur?.telephone || '' },
    ],
  }]);

  const phones = [telephone, ...passagers.map(p => p.telephone)].filter(Boolean);
  const tasks  = phones.map((tel, i) => {
    const name = i === 0 ? employe_name : (passagers[i - 1]?.name || 'vous');
    return sendTemplate(tel, 'sortie_validee', 'fr', params(name));
  });
  await Promise.allSettled(tasks);
};

/**
 * Notifie le chauffeur de son affectation
 * Template : "mission_chauffeur"
 * Corps :
 *   "Bonjour {{1}}, vous êtes affecté à une mission SysLog le {{2}}
 *    vers {{3}}. Départ : {{4}}. Contact initiateur : {{5}}."
 */
const notifyChauffeurMission = async ({ chauffeur_nom, telephone, date, communes, heure_depart, contact_initiateur }) => {
  await sendTemplate(telephone, 'mission_chauffeur', 'fr', [{
    type: 'body',
    parameters: [
      { type: 'text', text: chauffeur_nom },
      { type: 'text', text: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) },
      { type: 'text', text: communes.join(' & ') },
      { type: 'text', text: heure_depart || '' },
      { type: 'text', text: contact_initiateur || '' },
    ],
  }]);
};

/**
 * Notifie l'initiateur : demande refusée
 * Template : "sortie_refusee"
 * Corps :
 *   "Bonjour {{1}}, votre demande de sortie vers {{2}} le {{3}}
 *    a été refusée ❌. Motif : {{4}}. Contactez votre manager."
 */
const notifyDemandeRefusee = async ({ employe_name, telephone, communes, date, motif }) => {
  await sendTemplate(telephone, 'sortie_refusee', 'fr', [{
    type: 'body',
    parameters: [
      { type: 'text', text: employe_name },
      { type: 'text', text: communes.join(' & ') },
      { type: 'text', text: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }) },
      { type: 'text', text: motif || 'Non précisé' },
    ],
  }]);
};

/**
 * Notifie l'initiateur : mission clôturée (retour confirmé)
 * Template : "mission_cloturee"
 * Corps :
 *   "Bonjour {{1}}, votre mission vers {{2}} du {{3}} a été clôturée ✓.
 *    Distance parcourue : {{4}} km. Merci pour votre rapport."
 */
const notifyMissionCloturee = async ({ employe_name, telephone, communes, date, distance }) => {
  await sendTemplate(telephone, 'mission_cloturee', 'fr', [{
    type: 'body',
    parameters: [
      { type: 'text', text: employe_name },
      { type: 'text', text: communes.join(' & ') },
      { type: 'text', text: new Date(date + 'T00:00:00').toLocaleDateString('fr-FR') },
      { type: 'text', text: distance != null ? String(distance) : 'N/A' },
    ],
  }]);
};

/**
 * Alerte admin / responsable RH : permis chauffeur expiré ou proche expiration
 * Template : "alerte_permis"
 * Corps :
 *   "⚠ SysLog — Alerte permis : Le permis du chauffeur {{1}} (cat. {{2}})
 *    expire le {{3}}. Veuillez procéder au renouvellement."
 */
const notifyPermisExpiration = async ({ admin_telephone, chauffeur_nom, type_permis, date_expiration }) => {
  await sendTemplate(admin_telephone, 'alerte_permis', 'fr', [{
    type: 'body',
    parameters: [
      { type: 'text', text: chauffeur_nom },
      { type: 'text', text: type_permis },
      { type: 'text', text: new Date(date_expiration + 'T00:00:00').toLocaleDateString('fr-FR') },
    ],
  }]);
};

/**
 * Alerte admin : licence SysLog proche de l'expiration
 * Template : "alerte_licence"
 * Corps :
 *   "⚠ SysLog — Votre licence expire dans {{1}} jour(s) ({{2}}).
 *    Contactez Gesmalync pour renouveler."
 */
const notifyLicenceExpiration = async ({ admin_telephone, jours_restants, date_expiration }) => {
  await sendTemplate(admin_telephone, 'alerte_licence', 'fr', [{
    type: 'body',
    parameters: [
      { type: 'text', text: String(jours_restants) },
      { type: 'text', text: new Date(date_expiration + 'T00:00:00').toLocaleDateString('fr-FR') },
    ],
  }]);
};

module.exports = {
  sendText,
  sendTemplate,
  sendBulk,
  normalizePhone,
  notifyDemandeValidee,
  notifyChauffeurMission,
  notifyDemandeRefusee,
  notifyMissionCloturee,
  notifyPermisExpiration,
  notifyLicenceExpiration,
};
