/**
 * Page de configuration et de test WhatsApp Business
 * Accessible via /whatsapp (admin uniquement)
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ── Étapes de configuration ───────────────────────────────────
const STEPS = [
  {
    num: 1,
    title: 'Compte Meta Business',
    status: 'required',
    description: 'Créer ou utiliser un compte Meta Business existant pour ONG Espace Confiance.',
    link: 'https://business.facebook.com',
    linkLabel: 'Ouvrir Meta Business →',
    details: [
      'Aller sur business.facebook.com',
      'Créer un compte au nom d\'ONG Espace Confiance',
      'Vérifier l\'entreprise avec les documents officiels (RCCM ou statuts)',
    ],
  },
  {
    num: 2,
    title: 'Application Meta Developer',
    status: 'required',
    description: 'Créer une application de type "Business" sur la plateforme développeur Meta.',
    link: 'https://developers.facebook.com',
    linkLabel: 'Ouvrir Meta for Developers →',
    details: [
      'Aller sur developers.facebook.com',
      'Créer une nouvelle application → Type : Business',
      'Ajouter le produit "WhatsApp" à l\'application',
    ],
  },
  {
    num: 3,
    title: 'Numéro WhatsApp Business',
    status: 'required',
    description: 'Enregistrer un numéro de téléphone dédié (non utilisé sur WhatsApp personnel).',
    details: [
      'Le numéro doit être un numéro ivoirien (+225)',
      'Il ne doit PAS être déjà enregistré sur WhatsApp personnel',
      'Le PHONE_NUMBER_ID est visible dans le tableau de bord WhatsApp de l\'application',
    ],
  },
  {
    num: 4,
    title: 'Token d\'accès permanent',
    status: 'required',
    description: 'Générer un token permanent depuis le Meta Business Manager (pas le token temporaire de 24h).',
    details: [
      'Business Settings → System Users → Créer un System User',
      'Assigner les permissions WhatsApp à ce System User',
      'Générer un token permanent et le copier dans le fichier .env',
    ],
  },
  {
    num: 5,
    title: 'Templates de messages',
    status: 'required',
    description: 'Créer et faire approuver les templates de messages sur Meta Business Manager.',
    details: [
      'WhatsApp Manager → Message Templates → Créer un template',
      'Langue : Français (fr)',
      'Délai d\'approbation : 24h à 72h',
    ],
  },
  {
    num: 6,
    title: 'Webhook (optionnel)',
    status: 'optional',
    description: 'Configurer le webhook pour recevoir les accusés de livraison.',
    details: [
      'URL du webhook : https://VOTRE_DOMAINE/webhooks/whatsapp',
      'Token de vérification : valeur de WA_VERIFY_TOKEN dans .env',
      "App Secret de l'application Meta : à copier dans WA_APP_SECRET (vérification des signatures)",
      'Nécessite un accès HTTPS public (hébergement en ligne)',
    ],
  },
];

// ── Templates à soumettre à Meta ──────────────────────────────
const TEMPLATES = [
  {
    name: 'sortie_validee',
    category: 'UTILITY',
    body: 'Bonjour {{1}}, votre demande de sortie vers {{2}} le {{3}} a été validée ✅. Véhicule : {{4}}. Chauffeur : {{5}} ({{6}}).',
    params: ['Prénom Nom', 'Commune(s)', 'Date', 'Marque Modèle — Immatriculation', 'Nom chauffeur', 'Tél chauffeur'],
  },
  {
    name: 'mission_chauffeur',
    category: 'UTILITY',
    body: 'Bonjour {{1}}, vous êtes affecté à une mission SysLog le {{2}} vers {{3}}. Départ : {{4}}. Contact initiateur : {{5}}.',
    params: ['Prénom Nom chauffeur', 'Date', 'Commune(s)', 'Heure départ', 'Tél initiateur'],
  },
  {
    name: 'sortie_refusee',
    category: 'UTILITY',
    body: 'Bonjour {{1}}, votre demande de sortie vers {{2}} le {{3}} a été refusée ❌. Motif : {{4}}. Contactez votre manager.',
    params: ['Prénom Nom', 'Commune(s)', 'Date', 'Motif du refus'],
  },
  {
    name: 'mission_cloturee',
    category: 'UTILITY',
    body: 'Bonjour {{1}}, votre mission vers {{2}} du {{3}} a été clôturée ✓. Distance parcourue : {{4}} km. Merci pour votre rapport.',
    params: ['Prénom Nom', 'Commune(s)', 'Date', 'Distance en km'],
  },
];

// ── Composant principal ───────────────────────────────────────
export const WhatsAppPage = () => {
  const [testPhone,   setTestPhone]   = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sending,     setSending]     = useState(false);
  const [tab,         setTab]         = useState<'config' | 'templates' | 'test'>('config');
  const { data: status } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn:  () => api.get<{ data: { enabled: boolean; phone_configured: boolean; token_configured: boolean } }>('/whatsapp/status')
      .then(r => r.data.data),
  });
  const statusBadge = !status
    ? { label: '…', dot: 'bg-slate-300', cls: 'bg-slate-100 text-slate-600' }
    : status.enabled && status.phone_configured && status.token_configured
      ? { label: 'Activé', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-700' }
      : { label: 'Désactivé', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-600' };

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) return;
    setSending(true);
    try {
      await api.post('/whatsapp/test', { phone: testPhone, message: testMessage });
      toast.success('Message envoyé avec succès !');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erreur d\'envoi. Vérifiez la configuration.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <span className="text-2xl">💬</span> Notifications WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configuration de WhatsApp Business API pour les notifications automatiques
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${statusBadge.cls}`}>
          <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
          {statusBadge.label}
        </span>
      </div>

      {/* Bannière informative */}
      <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <span className="text-blue-500 text-xl flex-shrink-0">ℹ</span>
        <div className="text-sm text-blue-800">
          <strong>WhatsApp Cloud API (Meta)</strong> — Solution officielle et gratuite jusqu'à 1 000 conversations/mois.
          Suivez les étapes ci-dessous pour activer les notifications. Une fois configuré, mettre{' '}
          <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">WA_ENABLED=true</code>{' '}
          dans le fichier <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">backend/.env</code>.
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {([
          { key: 'config',    label: 'Guide de configuration' },
          { key: 'templates', label: `Templates à créer (${TEMPLATES.length})` },
          { key: 'test',      label: 'Tester l\'envoi' },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet : Guide de configuration ─────────────────── */}
      {tab === 'config' && (
        <div className="space-y-4">
          {STEPS.map(step => (
            <div key={step.num} className={`card p-5 border-l-4 ${step.status === 'optional' ? 'border-slate-300' : 'border-primary'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                  ${step.status === 'optional' ? 'bg-slate-100 text-slate-500' : 'bg-primary text-white'}`}>
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm">{step.title}</h3>
                    {step.status === 'optional' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Optionnel</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{step.description}</p>
                  <ul className="space-y-1">
                    {step.details.map((d, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                        <span className="text-primary mt-0.5 flex-shrink-0">→</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary font-medium hover:underline">
                      {step.linkLabel}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Variables .env à configurer */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-3">
              Variables à ajouter dans <code className="font-mono text-primary">backend/.env</code>
            </h3>
            <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm space-y-1">
              <div><span className="text-slate-500"># Activer WhatsApp</span></div>
              <div><span className="text-green-400">WA_ENABLED</span><span className="text-white">=true</span></div>
              <div className="mt-2"><span className="text-slate-500"># Depuis Meta Developer Dashboard</span></div>
              <div><span className="text-green-400">WA_PHONE_ID</span><span className="text-white">=1234567890123456</span></div>
              <div><span className="text-green-400">WA_TOKEN</span><span className="text-white">=EAAxxxxxxxxxxxxxx...</span></div>
              <div className="mt-2"><span className="text-slate-500"># Token personnalisé pour webhook</span></div>
              <div><span className="text-green-400">WA_VERIFY_TOKEN</span><span className="text-white">=syslog_webhook_verify_2026</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Onglet : Templates ────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2">
            <span className="flex-shrink-0">⚠</span>
            <span>
              Ces 6 templates doivent être créés et approuvés dans{' '}
              <strong>WhatsApp Manager → Message Templates</strong> avant de pouvoir envoyer des notifications.
              Délai d'approbation : <strong>24h à 72h</strong>.
            </span>
          </div>

          {TEMPLATES.map(t => (
            <div key={t.name} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <code className="text-sm font-bold text-primary font-mono bg-primary/8 px-2.5 py-1 rounded">
                  {t.name}
                </code>
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{t.category}</span>
                <span className="text-xs text-slate-400 ml-auto">Langue : fr</span>
              </div>
              <div className="bg-[#128C7E] text-white rounded-xl rounded-tl-none px-4 py-3 text-sm mb-3 max-w-sm leading-relaxed">
                {t.body}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {t.params.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-mono text-primary font-bold">{`{{${i + 1}}}`}</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onglet : Test d'envoi ─────────────────────────────── */}
      {tab === 'test' && (
        <div className="max-w-md">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Envoyer un message test</h3>
            <p className="text-sm text-slate-500 mb-5">
              Vérifiez que la configuration est correcte en envoyant un message texte libre.
              Requiert une session WhatsApp ouverte de 24h (l'utilisateur doit avoir initié un contact).
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Numéro de téléphone</label>
                <input value={testPhone} onChange={e => setTestPhone(e.target.value)}
                  placeholder="+225 07 00 00 00 00 ou 0700000000"
                  className="input" />
                <p className="text-xs text-slate-400 mt-1">Numéro ivoirien à 10 chiffres — normalisé automatiquement en +225 XX XX XX XX XX</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)}
                  rows={3} placeholder="Bonjour, ceci est un test de SysLog…"
                  className="input resize-none" />
              </div>
              <button onClick={sendTestMessage}
                disabled={!testPhone || !testMessage || sending}
                className="btn-primary w-full justify-center py-2.5">
                {sending
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Envoi…
                    </span>
                  : '💬 Envoyer le message test'
                }
              </button>
            </div>
          </div>

          <div className="mt-4 card p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Déclencheurs automatiques dans SysLog</h4>
            <div className="space-y-2.5">
              {[
                { event: 'Demande validée', recipients: 'Initiateur + tous les passagers + chauffeur', template: 'sortie_validee + mission_chauffeur' },
                { event: 'Demande refusée', recipients: 'Initiateur uniquement', template: 'sortie_refusee' },
                { event: 'Mission clôturée', recipients: 'Initiateur', template: 'mission_cloturee' },
              ].map(row => (
                <div key={row.event} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-700">{row.event}</div>
                    <div className="text-slate-400">{row.recipients}</div>
                    <div className="font-mono text-primary/70 text-[10px] mt-0.5">{row.template}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
