import { useNotifications } from '../hooks/useNotifications';
import { Notification } from '../types';

// ── Config visuelle par type ──────────────────────────────────
const TYPE_CONFIG: Record<Notification['type'], { icon: string; bg: string; border: string; color: string }> = {
  info:    { icon: 'ℹ', bg: 'bg-blue-50',   border: 'border-blue-200',   color: 'text-blue-700'   },
  success: { icon: '✓', bg: 'bg-emerald-50', border: 'border-emerald-200', color: 'text-emerald-700' },
  warning: { icon: '⚠', bg: 'bg-amber-50',  border: 'border-amber-200',  color: 'text-amber-700'  },
  error:   { icon: '✕', bg: 'bg-red-50',    border: 'border-red-200',    color: 'text-red-700'    },
};

// ── Formatage date relative ───────────────────────────────────
const fmtRelative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7)     return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Carte notification ────────────────────────────────────────
const NotificationCard = ({ notif, onMarkRead }: {
  notif: Notification;
  onMarkRead: (id: number) => void;
}) => {
  const cfg = TYPE_CONFIG[notif.type];
  return (
    <div className={`flex gap-4 p-4 rounded-lg border transition-all ${notif.read ? 'bg-white border-slate-200' : `${cfg.bg} ${cfg.border}`}`}>
      {/* Indicateur type */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold
        ${notif.read ? 'bg-slate-100 text-slate-400' : `${cfg.bg} ${cfg.color} border ${cfg.border}`}`}>
        {cfg.icon}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-semibold leading-snug ${notif.read ? 'text-slate-600' : 'text-slate-900'}`}>
            {notif.title}
          </p>
          {!notif.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className={`text-sm mt-0.5 leading-relaxed ${notif.read ? 'text-slate-400' : 'text-slate-600'}`}>
          {notif.message}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400">{fmtRelative(notif.created_at)}</span>
          {!notif.read && (
            <button
              onClick={() => onMarkRead(notif.id)}
              className="text-xs text-primary hover:underline font-medium"
            >
              Marquer comme lu
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
export const NotificationsPage = () => {
  const { notifications, isLoading, unreadCount, markRead, markAllRead } = useNotifications();

  const handleMarkRead = (id: number) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
              : 'Tout est à jour'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markAllRead.isPending}
            className="btn-secondary flex items-center gap-2 flex-shrink-0 text-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Tout marquer comme lu
          </button>
        )}
      </div>

      {/* Contenu */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          Chargement…
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <div className="font-medium text-slate-700 mb-1">Aucune notification</div>
          <div className="text-sm text-slate-400">Vous serez notifié ici lors des mises à jour de vos demandes.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Non lues en premier */}
          {unreadCount > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Non lues — {unreadCount}
              </div>
              <div className="space-y-2">
                {notifications
                  .filter(n => !n.read)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(n => (
                    <NotificationCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
                  ))}
              </div>
            </div>
          )}

          {/* Lues */}
          {notifications.some(n => n.read) && (
            <div className={unreadCount > 0 ? 'mt-5' : ''}>
              {unreadCount > 0 && (
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                  Lues
                </div>
              )}
              <div className="space-y-2">
                {notifications
                  .filter(n => n.read)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(n => (
                    <NotificationCard key={n.id} notif={n} onMarkRead={handleMarkRead} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
