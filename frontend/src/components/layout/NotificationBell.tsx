import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingActions } from '../../hooks/useRequests';

/** Pastille chiffrée (masquée à zéro, « 99+ » au-delà de 99). */
const CountBadge = ({ count, title }: { count: number; title: string }) =>
  count > 0 ? (
    <span
      title={title}
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center rounded-full ring-2 ring-white"
    >
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

/**
 * Cloche de l'en-tête.
 * - Managers / administrateurs : nombre d'actions qui les attendent (demandes à valider,
 *   missions à clôturer) ; un clic ouvre le détail. Le nombre diminue dès qu'une action est faite.
 * - Utilisateurs : nombre de notifications non lues ; un clic ouvre les notifications.
 */
export const NotificationBell = ({ canAct, unreadCount }: { canAct: boolean; unreadCount: number }) => {
  const navigate = useNavigate();
  const { data: pending } = usePendingActions(canAct);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc   = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  if (!canAct) {
    return (
      <button onClick={() => navigate('/notifications')} aria-label="Notifications"
        className="relative p-2 rounded-lg hover:bg-slate-100 text-lg">
        🔔
        <CountBadge count={unreadCount} title={`${unreadCount} notification(s) non lue(s)`} />
      </button>
    );
  }

  const total = pending?.total ?? 0;
  const go = (path: string) => { setOpen(false); navigate(path); };
  const plural = (n: number, s: string, p: string) => `${n} ${n > 1 ? p : s}`;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} aria-label="Actions en attente"
        className="relative p-2 rounded-lg hover:bg-slate-100 text-lg">
        🔔
        <CountBadge count={total} title={`${total} action(s) en attente`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Actions en attente
          </div>
          {total === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-500">✓ Aucune action en attente.</div>
          ) : (
            <>
              {pending!.a_valider > 0 && (
                <button onClick={() => go('/requests?statut=en_attente')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50">
                  <span className="text-lg">📋</span>
                  <span className="flex-1 text-slate-700">
                    {plural(pending!.a_valider, 'demande à valider', 'demandes à valider')}
                  </span>
                  <span className="text-slate-300">→</span>
                </button>
              )}
              {pending!.a_cloturer > 0 && (
                <button onClick={() => go('/requests?statut=validee')}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50">
                  <span className="text-lg">🏁</span>
                  <span className="flex-1 text-slate-700">
                    {plural(pending!.a_cloturer, 'mission à clôturer', 'missions à clôturer')}
                  </span>
                  <span className="text-slate-300">→</span>
                </button>
              )}
            </>
          )}
          <button onClick={() => go('/notifications')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-xs text-primary border-t border-slate-100 hover:bg-slate-50">
            Voir les notifications{unreadCount > 0 ? ` (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})` : ''}
          </button>
        </div>
      )}
    </div>
  );
};
