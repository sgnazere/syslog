import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useLicenseInfo } from '../../hooks/useLicense';
import { ROLE_LABELS, hasRole, isAdminRole } from '../../lib/constants';
import { UserRole, User } from '../../types';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { downloadFile } from '../../lib/api';
import { ChangePasswordModal } from '../shared/ChangePasswordModal';
import { NotificationBell } from './NotificationBell';

interface NavItem { path: string; label: string; roles: UserRole[]; icon: string; }

const NAV: NavItem[] = [
  { path: '/',              label: 'Tableau de bord',     roles: ['admin','manager','user'], icon: '🏠' },
  { path: '/requests',      label: 'Demandes de sortie',  roles: ['admin','manager','user'], icon: '📋' },
  { path: '/calendar',      label: 'Calendrier',          roles: ['admin','manager','user'], icon: '📅' },
  { path: '/employees',     label: 'Employés',            roles: ['admin','manager'],        icon: '👥' },
  { path: '/users',         label: 'Accès & Rôles',       roles: ['admin'],                  icon: '🔐' },
  { path: '/vehicles',      label: 'Véhicules',           roles: ['admin','manager'],        icon: '🚗' },
  { path: '/drivers',       label: 'Chauffeurs',          roles: ['admin','manager'],        icon: '👤' },
  { path: '/maintenance',   label: 'Maintenance',          roles: ['admin','manager'],        icon: '🔧' },
  { path: '/reports',       label: 'Rapports',            roles: ['admin','manager'],        icon: '📊' },
  { path: '/holidays',      label: 'Jours fériés',        roles: ['admin'],                  icon: '🗓️' },
  { path: '/audit',         label: 'Audit logs',          roles: ['admin'],                  icon: '🔍' },
  { path: '/notifications', label: 'Notifications',       roles: ['admin','manager','user'], icon: '🔔' },
  { path: '/license',       label: 'Licence',              roles: ['admin'],                  icon: '🔑' },
  { path: '/whatsapp',      label: 'WhatsApp Business',   roles: ['admin'],                  icon: '💬' },
];

// ── Sidebar — composant stable extrait du render parent ───────
interface SidebarProps {
  user: User;
  initials: string;
  visible: NavItem[];
  unreadCount: number;
  onClose: () => void;
  onLogout: () => void;
  onChangePassword: () => void;
}

const downloadManual = () =>
  downloadFile('/docs/manual', 'SysLog_Documentation_Utilisateur.docx')
    .catch(() => toast.error('Téléchargement impossible.'));

const Sidebar = ({ user, initials, visible, unreadCount, onClose, onLogout, onChangePassword }: SidebarProps) => (
  <nav className="flex flex-col h-full" style={{ background: '#1a2744' }}>
    <div className="px-5 py-4 border-b border-white/10">
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">🚌</span>
        <div>
          <div className="text-white font-bold text-sm">SysLog</div>
          <div className="text-white/40 text-xs">Gestion logistique</div>
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
      {visible.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-medium
            ${isActive
              ? 'bg-blue-600 text-white'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`
          }
        >
          <span className="text-base">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          {item.path === '/notifications' && unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </div>

    <div className="px-4 py-4 border-t border-white/10">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="w-9 h-9 rounded-full bg-blue-500/30 text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-white text-sm font-medium truncate">
            {user.name || `${user.prenom} ${user.nom}`}
          </div>
          <div className="text-white/40 text-xs">{ROLE_LABELS[user.role]}</div>
        </div>
      </div>
      {/* Télécharger le manuel (admin + manager) */}
      {hasRole(user.role, ['admin', 'manager']) && (
        <button
          type="button"
          onClick={downloadManual}
          className="w-full flex items-center gap-2 text-white/40 hover:text-white/70 text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors mb-1"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 18 15 15"/>
          </svg>
          Documentation utilisateur
        </button>
      )}
      <button
        onClick={onChangePassword}
        className="w-full flex items-center gap-2 text-white/40 hover:text-white/70 text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors mb-1"
      >
        <span>🔒</span> Changer mon mot de passe
      </button>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-2 text-white/50 hover:text-white text-xs px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
      >
        <span>↩</span> Déconnexion
      </button>
    </div>
  </nav>
);

// ── Layout principal ──────────────────────────────────────────
export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const mustChangePassword = !!user?.must_change_password;
  const { unreadCount } = useNotifications(!mustChangePassword);
  const { data: licenseData } = useLicenseInfo(isAdminRole(user?.role) && !mustChangePassword);

  const licenceWarning = (() => {
    const lic = licenseData?.data;
    if (!lic) return null;
    if (lic.is_expired) return { msg: 'Licence expirée — accès restreint', level: 'error' as const };
    if (lic.jours_restants <= 7)  return { msg: `Licence expire dans ${lic.jours_restants}j`, level: 'error' as const };
    if (lic.jours_restants <= 30) return { msg: `Licence expire dans ${lic.jours_restants} jours`, level: 'warn' as const };
    return null;
  })();

  if (!user) return null;

  const visible = NAV.filter(n => hasRole(user.role, n.roles));

  const initials = [user.prenom, user.nom]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('')
    .slice(0, 2) || user.email[0].toUpperCase();

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const sidebarProps: SidebarProps = {
    user, initials, visible, unreadCount,
    onClose: () => setOpen(false),
    onLogout: handleLogout,
    onChangePassword: () => { setOpen(false); setChangingPassword(true); },
  };

  // Mot de passe défini par un administrateur : changement obligatoire avant tout accès
  if (mustChangePassword) return <div className="h-screen bg-slate-50"><ChangePasswordModal forced /></div>;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col">
        <Sidebar {...sidebarProps} />
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 flex-shrink-0 flex flex-col z-50">
            <Sidebar {...sidebarProps} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-lg" onClick={() => setOpen(true)}>
            ☰
          </button>
          <div className="flex-1 text-sm text-slate-500 font-medium">
            {user.name || `${user.prenom} ${user.nom}`}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">
              {ROLE_LABELS[user.role]}
            </span>
            <NotificationBell canAct={hasRole(user.role, ['admin', 'manager'])} unreadCount={unreadCount} />
          </div>
        </header>
        {/* Bannière d'avertissement licence */}
        {licenceWarning && (
          <div className={`flex items-center justify-between gap-3 px-4 py-2 text-xs font-medium flex-shrink-0
            ${licenceWarning.level === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-amber-400 text-amber-900'
            }`}>
            <span>⚠ {licenceWarning.msg}</span>
            {isAdminRole(user?.role) && (
              <button onClick={() => navigate('/license')}
                className="underline font-semibold hover:opacity-80 whitespace-nowrap">
                Gérer la licence →
              </button>
            )}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
        {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
      </div>
    </div>
  );
};
