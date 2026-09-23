import { useState, useEffect } from 'react';
import { useAuditLogs, useAuditMeta, AuditLog } from '../hooks/useAudit';

// ── Config visuelle par action ────────────────────────────────
const ACTION_CFG: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  CREATE:   { label: 'Création',    icon: '✚', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  UPDATE:   { label: 'Modification',icon: '✎', color: 'text-blue-700',    bg: 'bg-blue-100'    },
  DELETE:   { label: 'Suppression', icon: '✕', color: 'text-red-700',     bg: 'bg-red-100'     },
  VALIDATE: { label: 'Validation',  icon: '✓', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  REJECT:   { label: 'Refus',       icon: '✗', color: 'text-red-700',     bg: 'bg-red-100'     },
  LOGIN:    { label: 'Connexion',   icon: '→', color: 'text-slate-700',   bg: 'bg-slate-100'   },
  TOGGLE:   { label: 'Activation',  icon: '⇄', color: 'text-amber-700',   bg: 'bg-amber-100'   },
  RESET_PW: { label: 'Réinit. MDP', icon: '⚿', color: 'text-amber-700',   bg: 'bg-amber-100'   },
};

const ENTITY_LABELS: Record<string, string> = {
  employee:  'Employé',
  vehicle:   'Véhicule',
  driver:    'Chauffeur',
  request:   'Demande',
  user:      'Utilisateur',
  holiday:   'Jour férié',
  commune:   'Commune',
};

const getActionCfg = (action: string) =>
  ACTION_CFG[action.toUpperCase()] ?? { label: action, icon: '•', color: 'text-slate-600', bg: 'bg-slate-100' };

const getEntityLabel = (entity: string) => ENTITY_LABELS[entity.toLowerCase()] ?? entity;

// ── Formatage date relative ───────────────────────────────────
const fmtDatetime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const fmtRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'À l\'instant';
  if (m < 60)  return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `Il y a ${d}j`;
  return fmtDatetime(iso);
};

// ── Initiales ─────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('').slice(0, 2) || '?';

// ── Analyse du champ details (JSON) ──────────────────────────
const parseDetails = (raw: string | null): Record<string, any> | null => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

// ── Modal détail d'un log ─────────────────────────────────────
const DetailModal = ({ log, onClose }: { log: AuditLog; onClose: () => void }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const cfg     = getActionCfg(log.action);
  const details = parseDetails(log.details);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${cfg.bg} ${cfg.color}`}>
              {cfg.icon}
            </div>
            <div>
              <div className="font-semibold text-slate-900">
                {cfg.label} — {getEntityLabel(log.entity)}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{fmtDatetime(log.created_at)}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Utilisateur */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
              {initials(log.user_name)}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{log.user_name}</div>
              <div className="text-xs text-slate-500">{log.user_email} · {log.user_role}</div>
            </div>
          </div>

          {/* Informations */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Action</div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entité</div>
              <div className="text-slate-700 font-medium">{getEntityLabel(log.entity)}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">ID entité</div>
              <div className="font-mono text-slate-700 text-xs">{log.entity_id || '—'}</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Adresse IP</div>
              <div className="font-mono text-slate-700 text-xs">{log.ip_address || '—'}</div>
            </div>
          </div>

          {/* Détails JSON */}
          {details && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Données de la requête
              </div>
              {details.body && Object.keys(details.body).length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-slate-500 mb-1">Corps</div>
                  <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                    <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(details.body, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {details.params && Object.keys(details.params).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-slate-500 mb-1">Paramètres</div>
                  <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                    <pre className="text-xs text-blue-400 font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(details.params, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Ligne de log ──────────────────────────────────────────────
const AuditRow = ({ log, onClick }: { log: AuditLog; onClick: () => void }) => {
  const cfg = getActionCfg(log.action);
  return (
    <tr
      onClick={onClick}
      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
    >
      {/* Utilisateur */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {initials(log.user_name)}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-900 whitespace-nowrap">{log.user_name}</div>
            <div className="text-xs text-slate-400">{log.user_email}</div>
          </div>
        </div>
      </td>

      {/* Action */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
          <span>{cfg.icon}</span>
          {cfg.label}
        </span>
      </td>

      {/* Entité */}
      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
        {getEntityLabel(log.entity)}
      </td>

      {/* ID entité */}
      <td className="px-4 py-3 text-xs font-mono text-slate-500">
        {log.entity_id && log.entity_id !== 'N/A' ? `#${log.entity_id}` : '—'}
      </td>

      {/* IP */}
      <td className="px-4 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
        {log.ip_address || '—'}
      </td>

      {/* Date */}
      <td className="px-4 py-3 text-right">
        <div className="text-xs text-slate-500 whitespace-nowrap">{fmtRelative(log.created_at)}</div>
        <div className="text-[10px] text-slate-300">{fmtDatetime(log.created_at)}</div>
      </td>

      {/* Détail */}
      <td className="px-4 py-3 text-center">
        <span className="text-xs text-primary hover:underline font-medium">Voir →</span>
      </td>
    </tr>
  );
};

// ── Page principale ───────────────────────────────────────────
const PAGE_SIZE = 50;

export const AuditPage = () => {
  const [filters, setFilters] = useState({
    userId: '', entity: '', action: '', from: '', to: '',
  });
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<AuditLog | null>(null);

  // Reset la page à 1 quand les filtres changent
  const setFilter = (k: keyof typeof filters, v: string) => {
    setFilters(f => ({ ...f, [k]: v }));
    setPage(1);
  };

  const { data, isLoading } = useAuditLogs({
    ...filters,
    userId: filters.userId || undefined,
    entity: filters.entity || undefined,
    action: filters.action || undefined,
    from:   filters.from   || undefined,
    to:     filters.to     || undefined,
    page,
    limit: PAGE_SIZE,
  } as any);

  const { data: meta } = useAuditMeta();

  const logs    = data?.data  ?? [];
  const total   = data?.total ?? 0;
  const pages   = data?.pages ?? 1;
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Audit logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? 'Chargement…' : `${total.toLocaleString('fr-FR')} événement${total !== 1 ? 's' : ''} enregistré${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Stats rapides */}
      {meta && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card p-4">
            <div className="text-2xl font-bold text-slate-900">{total.toLocaleString('fr-FR')}</div>
            <div className="text-xs text-slate-500 mt-0.5">Événements totaux</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-blue-600">{meta.users.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Utilisateurs actifs</div>
          </div>
          <div className="card p-4">
            <div className="text-2xl font-bold text-amber-600">{meta.entities.length}</div>
            <div className="text-xs text-slate-500 mt-0.5">Types d'entités</div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
        {/* Utilisateur */}
        <select
          value={filters.userId}
          onChange={e => setFilter('userId', e.target.value)}
          className="input min-w-44 max-w-52 text-sm py-2"
        >
          <option value="">Tous les utilisateurs</option>
          {meta?.users.map(u => (
            <option key={u.user_id} value={u.user_id}>{u.user_name}</option>
          ))}
        </select>

        {/* Action */}
        <select
          value={filters.action}
          onChange={e => setFilter('action', e.target.value)}
          className="input min-w-36 max-w-44 text-sm py-2"
        >
          <option value="">Toutes les actions</option>
          {(meta?.actions ?? []).map(a => (
            <option key={a} value={a}>{getActionCfg(a).label}</option>
          ))}
        </select>

        {/* Entité */}
        <select
          value={filters.entity}
          onChange={e => setFilter('entity', e.target.value)}
          className="input min-w-36 max-w-44 text-sm py-2"
        >
          <option value="">Toutes les entités</option>
          {(meta?.entities ?? []).map(e => (
            <option key={e} value={e}>{getEntityLabel(e)}</option>
          ))}
        </select>

        {/* Plage de dates */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Du</span>
          <input type="date" value={filters.from}
            onChange={e => setFilter('from', e.target.value)}
            className="input text-sm py-2 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Au</span>
          <input type="date" value={filters.to}
            onChange={e => setFilter('to', e.target.value)}
            className="input text-sm py-2 w-36" />
        </div>

        {hasFilters && (
          <button
            onClick={() => { setFilters({ userId: '', entity: '', action: '', from: '', to: '' }); setPage(1); }}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Chargement…
        </div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔍</div>
          <div className="font-medium text-slate-700 mb-1">Aucun événement</div>
          <div className="text-sm text-slate-400">
            {hasFilters ? 'Aucun résultat pour ces filtres.' : 'Aucune action n\'a encore été enregistrée.'}
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Utilisateur', 'Action', 'Entité', 'ID', 'IP', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <AuditRow key={log.id} log={log} onClick={() => setSelected(log)} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination + footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <div className="text-xs text-slate-400">
              Page {page} / {pages} · {total.toLocaleString('fr-FR')} événement{total !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-100
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Préc.
              </button>

              {/* Numéros de page */}
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = page <= 3
                  ? i + 1
                  : page >= pages - 2
                    ? pages - 4 + i
                    : page - 2 + i;
                if (p < 1 || p > pages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-7 text-xs rounded-lg transition-colors
                      ${p === page ? 'bg-primary text-white' : 'border border-slate-200 hover:bg-slate-100 text-slate-600'}`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-100
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suiv. →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal détail */}
      {selected && <DetailModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};
