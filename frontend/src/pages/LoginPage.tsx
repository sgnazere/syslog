import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// ── Icônes SVG inline ─────────────────────────────────────────
const IconEmail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const IconLock = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconEye = ({ off }: { off?: boolean }) => off ? (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Fonctionnalités affichées sur le panneau gauche ───────────
const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    title: 'Gestion du parc automobile',
    desc:  'Suivi en temps réel des véhicules, statuts et kilométrage.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    title: 'Demandes de sortie',
    desc:  'Soumission, validation et affectation des missions terrain.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    title: 'Planning et calendrier',
    desc:  'Visualisation des sorties planifiées et disponibilités.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
    title: 'Rapports & tableaux de bord',
    desc:  'Statistiques d\'usage, communes, taux de validation.',
  },
];

// ── Page de connexion ─────────────────────────────────────────
export const LoginPage = () => {
  const { login } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [emailFocus,  setEmailFocus]  = useState(false);
  const [pwdFocus,    setPwdFocus]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Veuillez saisir votre adresse e-mail.'); return; }
    if (!password)     { setError('Veuillez saisir votre mot de passe.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Identifiants incorrects. Vérifiez vos informations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — identité de marque ───────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] flex-shrink-0 flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d1f40 0%, #1a3a6e 60%, #1e4d8c 100%)' }}
      >
        {/* Formes décoratives d'arrière-plan */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 65%)' }} />
          <div className="absolute -bottom-32 -left-16 w-[420px] h-[420px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)' }} />
          <div className="absolute top-1/2 right-8 w-40 h-40 rounded-full -translate-y-1/2"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)' }} />
          {/* Lignes de grille subtiles */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>

        {/* Contenu */}
        <div className="relative flex flex-col h-full px-10 py-10">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold text-lg tracking-tight leading-none">SysLog</div>
              <div className="text-white/40 text-xs mt-0.5 tracking-wide">Gestion logistique</div>
            </div>
          </div>

          {/* Accroche principale */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-white leading-tight mb-4">
              Pilotez votre parc<br />en toute sérénité.
            </h1>
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">
              Solution centralisée pour la gestion des sorties de véhicules, le suivi des missions terrain et le reporting logistique.
            </p>
          </div>

          {/* Liste des fonctionnalités */}
          <div className="space-y-5 flex-1">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <div className="text-white/70">{f.icon}</div>
                </div>
                <div>
                  <div className="text-white/90 text-sm font-semibold leading-snug">{f.title}</div>
                  <div className="text-white/40 text-xs mt-0.5 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pied de page */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-white/30 text-xs">
                © {new Date().getFullYear()} — Tous droits réservés
              </div>
              <div className="text-white/20 text-xs font-mono">v1.0.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panneau droit — formulaire de connexion ────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-[400px]">

          {/* Logo mobile uniquement */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/>
                <path d="M16 8h4l3 3v5h-7V8z"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base">SysLog</div>
              <div className="text-slate-400 text-xs">Gestion logistique</div>
            </div>
          </div>

          {/* En-tête formulaire */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Connexion</h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Entrez vos identifiants pour accéder à votre espace.
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse e-mail
              </label>
              <div className={`relative flex items-center rounded-lg border bg-white transition-all duration-150
                ${emailFocus
                  ? 'border-primary ring-2 ring-primary/15'
                  : error && !email ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
                }`}>
                <div className={`pl-3.5 flex-shrink-0 transition-colors ${emailFocus ? 'text-primary' : 'text-slate-400'}`}>
                  <IconEmail />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  placeholder="votre@adresse.ci"
                  autoComplete="email"
                  className="flex-1 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none rounded-lg"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className={`relative flex items-center rounded-lg border bg-white transition-all duration-150
                ${pwdFocus
                  ? 'border-primary ring-2 ring-primary/15'
                  : error && !password ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
                }`}>
                <div className={`pl-3.5 flex-shrink-0 transition-colors ${pwdFocus ? 'text-primary' : 'text-slate-400'}`}>
                  <IconLock />
                </div>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  onFocus={() => setPwdFocus(true)}
                  onBlur={() => setPwdFocus(false)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="flex-1 px-3 py-3 text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="pr-3.5 flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  <IconEye off={showPwd} />
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span className="text-sm text-red-700 leading-snug">{error}</span>
              </div>
            )}

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all duration-150
                disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading
                  ? 'linear-gradient(135deg, #1a4f8a, #1a3a6e)'
                  : 'linear-gradient(135deg, #1e5aaa, #1a4f8a)',
                boxShadow: loading ? 'none' : '0 2px 8px rgba(26,79,138,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Vérification en cours…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Se connecter
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Informations de sécurité */}
          <div className="mt-6 p-4 rounded-lg bg-white border border-slate-200">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <div className="space-y-1">
                {[
                  'Connexion sécurisée par chiffrement JWT',
                  'Session active 8 heures',
                  'Toutes les actions sont auditées',
                ].map(item => (
                  <div key={item} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="text-slate-300"><IconCheck /></div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Note d'accès */}
          <p className="mt-5 text-center text-xs text-slate-400 leading-relaxed">
            Accès réservé au personnel autorisé.<br />
            Pour toute demande de compte, contactez votre administrateur système.
          </p>

          {/* Pied de page mobile */}
          <div className="mt-8 pt-5 border-t border-slate-200 text-center text-xs text-slate-300">
            © {new Date().getFullYear()} SysLog — Tous droits réservés
          </div>
        </div>
      </div>
    </div>
  );
};
