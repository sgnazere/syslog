import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  useLicenseInfo, useGenerateLicense, useActivateLicense,
  useToggleLicenseStatus, useSessions, useKillSession,
} from '../hooks/useLicense';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (iso?: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }) : '—';

const fmtDatetime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const today = () => new Date().toISOString().split('T')[0];

// ── Jauge d'utilisation ───────────────────────────────────────
const Gauge = ({ label, current, max, color }: {
  label: string; current: number; max: number; color: string;
}) => {
  const pct     = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const isAlert = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className={`text-sm font-bold ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>
          {current} / {max}
          <span className="text-xs font-normal text-slate-400 ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isAlert ? 'bg-red-500' : color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ── Badge statut licence ──────────────────────────────────────
const StatutBadge = ({ statut, isExpired }: { statut: string; isExpired: boolean }) => {
  if (isExpired || statut === 'expiree')
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Expirée
    </span>;
  if (statut === 'suspendue')
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Suspendue
    </span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
  </span>;
};

// ── Formulaire de génération de licence ───────────────────────
const GenerateForm = ({ onDone }: { onDone: (key: string) => void }) => {
  const generateMutation = useGenerateLicense();
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  const [form, setForm] = useState({
    organisation:    '',
    contact:         '',
    max_utilisateurs: '20',
    max_connexions:  '10',
    date_expiration: '',
    notes:           '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.organisation || !form.date_expiration) return;
    const res = await generateMutation.mutateAsync({
      organisation:    form.organisation.trim(),
      contact:         form.contact.trim() || undefined,
      max_utilisateurs: parseInt(form.max_utilisateurs),
      max_connexions:  parseInt(form.max_connexions),
      date_expiration: form.date_expiration,
      notes:           form.notes.trim() || undefined,
    });
    onDone(res.data?.data?.cle || '');
  };

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Organisation *</label>
          <input value={form.organisation} onChange={e => set('organisation', e.target.value)}
            placeholder="ONG Logistec Côte d'Ivoire" required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
          <input value={form.contact} onChange={e => set('contact', e.target.value)}
            placeholder="admin@organisation.ci" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d'expiration *</label>
          <input type="date" value={form.date_expiration} onChange={e => set('date_expiration', e.target.value)}
            min={minDate.toISOString().split('T')[0]} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Max utilisateurs</label>
          <input type="number" min="1" max="500" value={form.max_utilisateurs}
            onChange={e => set('max_utilisateurs', e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Max connexions simultanées</label>
          <input type="number" min="1" max="100" value={form.max_connexions}
            onChange={e => set('max_connexions', e.target.value)} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes internes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows={2} placeholder="Informations sur ce contrat…" className="input resize-none" />
        </div>
      </div>
      <button type="submit" disabled={generateMutation.isPending} className="btn-primary w-full justify-center py-2.5">
        {generateMutation.isPending
          ? <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Génération en cours…
            </span>
          : '✦ Générer la licence'
        }
      </button>
    </form>
  );
};

// ── Affichage de la clé générée ───────────────────────────────
const GeneratedKeyDisplay = ({ licenseKey, onClose }: { licenseKey: string; onClose: () => void }) => {
  const [copied, setCopied] = useState(false);

  const copyKey = () => {
    navigator.clipboard.writeText(licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg flex-shrink-0">
            ✓
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Licence générée avec succès</h3>
            <p className="text-xs text-slate-500 mt-0.5">Copiez et conservez cette clé en lieu sûr.</p>
          </div>
        </div>

        <div className="p-4 bg-slate-900 rounded-lg mb-4">
          <div className="font-mono text-emerald-400 text-lg text-center tracking-wider break-all select-all">
            {licenseKey}
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 mb-4">
          <span className="flex-shrink-0 mt-0.5">⚠</span>
          <span>Cette clé ne sera <strong>affichée qu'une seule fois</strong>. Notez-la ou utilisez le bouton ci-dessous pour l'activer immédiatement.</span>
        </div>

        <div className="flex gap-2">
          <button onClick={copyKey}
            className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-colors
              ${copied ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'btn-secondary'}`}>
            {copied ? '✓ Copié !' : 'Copier la clé'}
          </button>
          <button onClick={onClose} className="btn-primary flex-1">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
export const LicensePage = () => {
  // Émission et suspension des licences : super-administrateur uniquement
  const isSuperAdmin = useAuth().user?.role === 'superadmin';
  const { data: licenseData, isLoading } = useLicenseInfo();
  const { data: sessionsData, isLoading: loadingSessions } = useSessions();
  const activateMutation  = useActivateLicense();
  const toggleMutation    = useToggleLicenseStatus();
  const killMutation      = useKillSession();

  const [tab,           setTab]           = useState<'info' | 'sessions' | 'generate' | 'activate'>('info');
  const [activationKey, setActivationKey] = useState('');
  const [generatedKey,  setGeneratedKey]  = useState('');

  const licence = licenseData?.data;
  const stats   = licenseData?.stats;
  const sessions = sessionsData?.data ?? [];

  const joursRestants = licence?.jours_restants ?? 0;
  const isExpiringSoon = joursRestants > 0 && joursRestants <= 30;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey.trim()) return;
    await activateMutation.mutateAsync(activationKey.trim());
    setActivationKey('');
  };

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Licence SysLog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gestion de la licence d'utilisation et des sessions actives
          </p>
        </div>
        {licence && <StatutBadge statut={licence.statut} isExpired={licence.is_expired} />}
      </div>

      {/* Alerte expiration imminente */}
      {licence && isExpiringSoon && !licence.is_expired && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-3">
          <span className="text-amber-500 text-xl flex-shrink-0">⚠</span>
          <div>
            <div className="font-semibold text-amber-800 text-sm">
              Licence expirant dans {joursRestants} jour{joursRestants > 1 ? 's' : ''}
            </div>
            <div className="text-xs text-amber-600 mt-0.5">
              Contactez votre fournisseur SysLog pour renouveler votre licence avant le {fmtDate(licence.date_expiration)}.
            </div>
          </div>
        </div>
      )}

      {/* Alerte licence expirée */}
      {licence?.is_expired && (
        <div className="mb-5 p-4 bg-red-50 border border-red-300 rounded-lg flex items-start gap-3">
          <span className="text-red-500 text-xl flex-shrink-0">🔒</span>
          <div>
            <div className="font-semibold text-red-800 text-sm">Licence expirée</div>
            <div className="text-xs text-red-600 mt-0.5">
              La licence a expiré le {fmtDate(licence.date_expiration)}.
              Le système est en mode restreint. Activez une nouvelle clé pour reprendre le service.
            </div>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 mb-5 border-b border-slate-200">
        {([
          { key: 'info',     label: 'Informations' },
          { key: 'sessions', label: `Sessions actives${stats ? ` (${stats.connexions_actives})` : ''}` },
          { key: 'activate', label: 'Activer une clé' },
          ...(isSuperAdmin ? [{ key: 'generate', label: '✦ Générer une licence' }] as const : []),
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet : Informations ─────────────────────────────── */}
      {tab === 'info' && (
        <div className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Chargement…
            </div>
          ) : !licence ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-4">🔑</div>
              <div className="font-semibold text-slate-700 mb-2">Aucune licence enregistrée</div>
              <div className="text-sm text-slate-400 mb-5">
                Générez une nouvelle licence ou activez une clé existante pour utiliser SysLog.
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => setTab('activate')} className="btn-secondary">
                  Activer une clé
                </button>
                {isSuperAdmin && (
                  <button onClick={() => setTab('generate')} className="btn-primary">
                    Générer une licence
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Carte principale */}
              <div className="card p-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Clé */}
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Clé de licence
                    </div>
                    <div className="font-mono text-slate-800 text-lg tracking-wider bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200">
                      {licence.cle_masquee}
                    </div>
                  </div>
                  {/* Organisation */}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Organisation</div>
                    <div className="font-semibold text-slate-900">{licence.organisation}</div>
                    {licence.contact && <div className="text-xs text-slate-500 mt-0.5">{licence.contact}</div>}
                  </div>
                  {/* Validité */}
                  <div>
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Validité</div>
                    <div className="text-slate-900">
                      {fmtDate(licence.date_debut)} → {fmtDate(licence.date_expiration)}
                    </div>
                    {!licence.is_expired && (
                      <div className={`text-xs mt-0.5 font-medium ${joursRestants <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {joursRestants <= 0 ? 'Expirée' : `${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''}`}
                      </div>
                    )}
                  </div>
                  {/* Modules */}
                  {licence.modules && licence.modules !== 'all' && (
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Modules</div>
                      <div className="text-slate-700">{licence.modules}</div>
                    </div>
                  )}
                  {licence.notes && (
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</div>
                      <div className="text-slate-600 text-sm">{licence.notes}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-5 pt-5 border-t border-slate-100">
                  <button onClick={() => setTab('activate')} className="btn-secondary text-sm">
                    Changer de clé
                  </button>
                  {!isSuperAdmin ? null : licence.statut === 'active' ? (
                    <button onClick={() => toggleMutation.mutate({ id: licence.id, statut: 'suspendue' })}
                      className="text-sm px-3 py-2 text-amber-700 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                      Suspendre
                    </button>
                  ) : (
                    <button onClick={() => toggleMutation.mutate({ id: licence.id, statut: 'active' })}
                      className="text-sm px-3 py-2 text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                      Réactiver
                    </button>
                  )}
                </div>
              </div>

              {/* Jauges d'utilisation */}
              {stats && (
                <div className="card p-6 space-y-5">
                  <h3 className="font-semibold text-slate-900 text-sm">Utilisation de la licence</h3>
                  <Gauge
                    label="Utilisateurs actifs"
                    current={stats.utilisateurs_actifs}
                    max={licence.max_utilisateurs}
                    color="bg-primary"
                  />
                  <Gauge
                    label="Connexions simultanées"
                    current={stats.connexions_actives}
                    max={licence.max_connexions}
                    color="bg-blue-500"
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Onglet : Sessions actives ─────────────────────────── */}
      {tab === 'sessions' && (
        <div>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Chargement…</div>
          ) : sessions.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-3">🔌</div>
              <div className="font-medium text-slate-700 mb-1">Aucune session active</div>
              <div className="text-sm text-slate-400">Personne n'est connecté en ce moment.</div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {['Utilisateur', 'Rôle', 'Adresse IP', 'Dernière activité', 'Expiration', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{s.prenom} {s.nom}</div>
                          <div className="text-xs text-slate-400">{s.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                            {s.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-slate-600">{s.ip_address || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDatetime(s.last_seen)}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDatetime(s.expires_at)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => killMutation.mutate(s.id)}
                            className="text-xs px-2.5 py-1.5 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                            Déconnecter
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} active{sessions.length !== 1 ? 's' : ''}
                {licence && ` · Max : ${licence.max_connexions}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Onglet : Activer une clé ──────────────────────────── */}
      {tab === 'activate' && (
        <div className="max-w-lg">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Activation de licence</h3>
            <p className="text-sm text-slate-500 mb-5">
              Entrez votre clé de licence au format <code className="text-primary font-mono text-xs">SL-XXXXXXXX-XXXXXXXX-XXXXXXXX</code>
            </p>
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Clé de licence *</label>
                <input
                  value={activationKey}
                  onChange={e => setActivationKey(e.target.value.toUpperCase())}
                  placeholder="SL-A3F8D9B2-7C4E1F0A-8B2C4D6E"
                  className="input font-mono tracking-wider"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>
              <button type="submit" disabled={!activationKey.trim() || activateMutation.isPending}
                className="btn-primary w-full justify-center py-2.5">
                {activateMutation.isPending
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Activation…
                    </span>
                  : '✓ Activer la licence'
                }
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Onglet : Générer une licence ──────────────────────── */}
      {tab === 'generate' && isSuperAdmin && (
        <div className="max-w-lg">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-900 mb-1">Générer une nouvelle licence</h3>
            <p className="text-sm text-slate-500 mb-5">
              Crée une clé de licence cryptographique liée à une organisation.
              La clé générée sera affichée <strong>une seule fois</strong>.
            </p>
            <GenerateForm onDone={(key) => { setGeneratedKey(key); }} />
          </div>
        </div>
      )}

      {/* Modal affichage clé générée */}
      {generatedKey && (
        <GeneratedKeyDisplay licenseKey={generatedKey} onClose={() => { setGeneratedKey(''); setTab('info'); }} />
      )}
    </div>
  );
};
