import { useState, useMemo, useEffect } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useToggleUserActive, useResetUserPassword } from '../hooks/useUsers';
import { useEmployees } from '../hooks/useEmployees';
import { passwordProblem, PASSWORD_HINT } from '../components/shared/ChangePasswordModal';
import { User, UserRole } from '../types';
import { ROLE_LABELS, ROLE_COLORS, isAdminRole } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

// ── Config rôles ──────────────────────────────────────────────
const ROLE_AVATAR_BG: Record<UserRole, string> = {
  superadmin: 'bg-slate-800 text-white',
  admin:   'bg-red-100   text-red-700',
  manager: 'bg-amber-100 text-amber-700',
  user:    'bg-blue-100  text-blue-700',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user',    label: 'Utilisateur' },
  { value: 'manager', label: 'Manager'     },
  { value: 'admin',   label: 'Administrateur' },
  { value: 'superadmin', label: 'Super-administrateur' },
];

// ── Helpers ───────────────────────────────────────────────────
const getInitials = (u: User) =>
  [u.prenom, u.nom].filter(Boolean).map(s => s[0].toUpperCase()).join('').slice(0, 2) || '?';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Modal création / modification ─────────────────────────────
interface UserFormState {
  nom:         string;
  prenom:      string;
  email:       string;
  role:        UserRole;
  is_active:   boolean;
  employee_id: string;
  password:    string;
}

const emptyForm: UserFormState = {
  nom: '', prenom: '', email: '', role: 'user',
  is_active: true, employee_id: '', password: '',
};

const toForm = (u: User): UserFormState => ({
  nom:         u.nom         || '',
  prenom:      u.prenom      || '',
  email:       u.email       || '',
  role:        u.role,
  is_active:   u.is_active   ?? true,
  employee_id: u.employee_id ? String(u.employee_id) : '',
  password:    '',
});

const UserModal = ({
  user,
  onClose,
  availableEmployees,
  allEmployees,
}: {
  user?:               User | null;
  onClose:             () => void;
  availableEmployees:  any[];   // sans compte
  allEmployees:        any[];   // tous les actifs
}) => {
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const isEdit         = !!user;

  const [form,     setForm]     = useState<UserFormState>(isEdit ? toForm(user!) : emptyForm);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [showPwd,  setShowPwd]  = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (k: keyof UserFormState, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  // Pré-remplissage depuis l'employé sélectionné (mode création)
  const handleEmployeeSelect = (empId: string) => {
    set('employee_id', empId);
    if (empId) {
      const emp = allEmployees.find((e: any) => String(e.id) === empId);
      if (emp) {
        setForm(f => ({
          ...f,
          employee_id: empId,
          nom:         emp.nom    || f.nom,
          prenom:      emp.prenoms || f.prenom,
          email:       emp.email  || f.email,
        }));
        setErrors({});
      }
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.prenom.trim())  e.prenom = 'Prénom requis';
    if (!form.nom.trim())     e.nom    = 'Nom requis';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email valide requis';
    if (!isEdit && passwordProblem(form.password))
      e.password = `Mot de passe : ${passwordProblem(form.password)}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isEdit) {
      await updateMutation.mutateAsync({
        id:   user!.id,
        data: {
          nom:         form.nom.trim().toUpperCase(),
          prenom:      form.prenom.trim(),
          email:       form.email.trim().toLowerCase(),
          role:        form.role,
          is_active:   form.is_active,
          employee_id: form.employee_id ? parseInt(form.employee_id) : undefined,
        },
      });
    } else {
      await createMutation.mutateAsync({
        nom:         form.nom.trim().toUpperCase(),
        prenom:      form.prenom.trim(),
        email:       form.email.trim().toLowerCase(),
        role:        form.role,
        password:    form.password,
        employee_id: form.employee_id ? parseInt(form.employee_id) : undefined,
      });
    }
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  // En mode création, proposer les employés sans compte ; en édition, tous les employés actifs
  const empOptions = isEdit ? allEmployees : availableEmployees;
  const isSuperAdmin = useAuth().user?.role === 'superadmin';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">
              {isEdit ? `Modifier ${user!.prenom} ${user!.nom}` : 'Créer un compte utilisateur'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Champs obligatoires marqués *</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Lien employé */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Employé lié
              <span className="ml-1.5 text-xs font-normal text-slate-400">(optionnel — pré-remplit les informations)</span>
            </label>
            <select
              value={form.employee_id}
              onChange={e => handleEmployeeSelect(e.target.value)}
              className="input"
            >
              <option value="">— Sélectionner un employé —</option>
              {empOptions.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.prenoms} {e.nom}{e.poste ? ` — ${e.poste}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Identité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénom *</label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
                placeholder="Jean" className={`input ${errors.prenom ? 'border-red-400' : ''}`} />
              {errors.prenom && <p className="text-xs text-red-500 mt-1">{errors.prenom}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)}
                placeholder="DUPONT" className={`input uppercase ${errors.nom ? 'border-red-400' : ''}`} />
              {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse e-mail *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="jean.dupont@organisation.ci"
              className={`input ${errors.email ? 'border-red-400' : ''}`} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rôle *</label>
            <select value={form.role} onChange={e => set('role', e.target.value as UserRole)} className="input">
              {ROLE_OPTIONS.filter(r => r.value !== 'superadmin' || isSuperAdmin).map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              {form.role === 'superadmin' && 'Tous les droits administrateur + émission et suspension des licences, gestion des super-administrateurs.'}
              {form.role === 'admin'   && 'Accès complet — gestion des comptes, audit, jours fériés.'}
              {form.role === 'manager' && 'Validation des demandes, gestion du parc et des chauffeurs.'}
              {form.role === 'user'    && 'Création de demandes de sortie, consultation du calendrier.'}
            </p>
          </div>

          {/* Statut — seulement en modification */}
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut du compte</label>
              <div className="flex gap-3">
                {[
                  { value: true,  label: 'Actif',   cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                  { value: false, label: 'Inactif', cls: 'bg-slate-50 border-slate-300 text-slate-600'       },
                ].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => set('is_active', opt.value)}
                    className={`flex-1 py-2 text-sm rounded-lg border-2 font-medium transition-all
                      ${form.is_active === opt.value ? opt.cls : 'border-slate-200 text-slate-400 bg-white hover:bg-slate-50'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mot de passe — seulement en création */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe *</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder={PASSWORD_HINT}
                  className={`input pr-10 ${errors.password ? 'border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={isSaving} className="btn-primary flex-1">
            {isSaving
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Enregistrement…
                </span>
              : isEdit ? 'Mettre à jour' : 'Créer le compte'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal réinitialisation mot de passe ───────────────────────
const ResetPasswordModal = ({ user, onClose }: { user: User; onClose: () => void }) => {
  const resetMutation = useResetUserPassword();
  const [pwd,     setPwd]     = useState('');
  const [confirm, setConfirm] = useState('');
  const [show,    setShow]    = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (passwordProblem(pwd)) e.pwd   = passwordProblem(pwd)!;
    if (pwd !== confirm)    e.confirm  = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await resetMutation.mutateAsync({ id: user.id, newPassword: pwd });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700 text-lg">
            🔑
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Réinitialiser le mot de passe</h3>
            <p className="text-xs text-slate-500 mt-0.5">{user.prenom} {user.nom} · {user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nouveau mot de passe *</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={pwd}
                onChange={e => { setPwd(e.target.value); setErrors(er => ({ ...er, pwd: '' })); }}
                placeholder={PASSWORD_HINT}
                className={`input pr-10 ${errors.pwd ? 'border-red-400' : ''}`} />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">
                {show ? '🙈' : '👁'}
              </button>
            </div>
            {errors.pwd && <p className="text-xs text-red-500 mt-1">{errors.pwd}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer *</label>
            <input type={show ? 'text' : 'password'} value={confirm}
              onChange={e => { setConfirm(e.target.value); setErrors(er => ({ ...er, confirm: '' })); }}
              placeholder="Répéter le mot de passe"
              className={`input ${errors.confirm ? 'border-red-400' : ''}`} />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          {/* Indicateur de force */}
          {pwd.length > 0 && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[10, 12, 14, 16].map(n => (
                  <div key={n} className={`h-1 flex-1 rounded-full transition-colors
                    ${pwd.length >= n ? (n <= 10 ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-200'}`} />
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {passwordProblem(pwd) ? 'Insuffisant' : pwd.length < 12 ? 'Correct' : 'Fort'}
                {' · '}L'utilisateur devra le changer à sa prochaine connexion.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={resetMutation.isPending}
            className="flex-1 py-2 text-sm bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50">
            {resetMutation.isPending
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Réinitialisation…
                </span>
              : 'Réinitialiser'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Carte utilisateur (vue grille) ────────────────────────────
const UserCard = ({
  user,
  canManage,
  onEdit,
  onResetPwd,
  onToggle,
}: {
  user:       User;
  canManage:  boolean;
  onEdit:     () => void;
  onResetPwd: () => void;
  onToggle:   () => void;
}) => (
  <div className={`card p-4 hover:shadow-md transition-shadow ${!user.is_active ? 'opacity-70' : ''}`}>
    <div className="flex items-start gap-3 mb-4">
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0 ${ROLE_AVATAR_BG[user.role]}`}>
        {getInitials(user)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-slate-900 text-sm truncate">
            {user.prenom} {user.nom}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
        </div>
        <div className="text-xs text-slate-400 truncate mt-0.5">{user.email}</div>
      </div>
    </div>

    <div className="space-y-1.5 text-sm mb-4">
      {(user.employee_poste || user.employee_projet) && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 text-xs">Poste</span>
          <span className="text-slate-700 text-xs truncate max-w-40">
            {[user.employee_poste, user.employee_projet].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
      {(user as any).service_nom && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500 text-xs">Service</span>
          <span className="text-slate-700 text-xs truncate max-w-40">{(user as any).service_nom}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500 text-xs">Dernier accès</span>
        <span className="text-slate-600 text-xs">{fmtDate(user.last_login)}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500 text-xs">Statut</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
          ${user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {user.is_active ? 'Actif' : 'Inactif'}
        </span>
      </div>
    </div>

    {/* Actions */}
    {canManage && <div className="pt-3 border-t border-slate-100 flex gap-2">
      <button onClick={onEdit} className="btn-secondary flex-1 py-1.5 text-xs">
        Modifier
      </button>
      <button onClick={onResetPwd}
        className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        title="Réinitialiser le mot de passe">
        🔑
      </button>
      <button onClick={onToggle}
        className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors
          ${user.is_active
            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        title={user.is_active ? 'Désactiver le compte' : 'Activer le compte'}>
        {user.is_active ? '✕' : '✓'}
      </button>
    </div>}
  </div>
);

// ── Page principale ───────────────────────────────────────────
export const UsersPage = () => {
  const [filters,    setFilters]    = useState({ search: '', role: '', active: '' });
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('list');
  const [editing,    setEditing]    = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetting,  setResetting]  = useState<User | null>(null);

  const { data: users = [], isLoading } = useUsers(filters.search || undefined);
  const { data: employees = [] }        = useEmployees('actif');
  const toggleMutation                  = useToggleUserActive();

  // Filtre côté client (role, active)
  const filtered = useMemo(() => {
    return users.filter(u => {
      if (filters.role   && u.role          !== filters.role)          return false;
      if (filters.active === 'true'  && !u.is_active)                  return false;
      if (filters.active === 'false' &&  u.is_active)                  return false;
      return true;
    });
  }, [users, filters.role, filters.active]);

  const availableEmployees = employees.filter(e => !users.find(u => u.employee_id === e.id));

  // Seul un super-administrateur agit sur les comptes super-administrateur
  const me = useAuth().user;
  const canManageUser = (u: User) => me?.role === 'superadmin' || u.role !== 'superadmin';

  const stats = {
    total:    users.length,
    admins:   users.filter(u => isAdminRole(u.role)).length,
    managers: users.filter(u => u.role === 'manager').length,
    actifs:   users.filter(u => u.is_active).length,
    inactifs: users.filter(u => !u.is_active).length,
  };

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Accès & Rôles</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} compte{stats.total !== 1 ? 's' : ''} utilisateur{stats.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Créer un compte
        </button>
      </div>

      {/* Bannière info employés sans compte */}
      {availableEmployees.length > 0 && (
        <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center gap-2">
          <span>ℹ</span>
          <span>
            <strong>{availableEmployees.length}</strong> employé{availableEmployees.length > 1 ? 's' : ''} n'ont pas encore de compte.{' '}
            <button onClick={() => setShowCreate(true)} className="underline font-medium hover:text-blue-900">
              Créer un accès →
            </button>
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total',         val: stats.total,    color: 'text-slate-900'   },
          { label: 'Admins',        val: stats.admins,   color: 'text-red-600'     },
          { label: 'Managers',      val: stats.managers, color: 'text-amber-600'   },
          { label: 'Actifs',        val: stats.actifs,   color: 'text-emerald-600' },
          { label: 'Inactifs',      val: stats.inactifs, color: 'text-slate-500'   },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
        <input
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Rechercher par nom, email…"
          className="input flex-1 min-w-48 text-sm py-2"
        />
        <select value={filters.role}
          onChange={e => setFilters(f => ({ ...f, role: e.target.value }))}
          className="input min-w-36 max-w-44 text-sm py-2">
          <option value="">Tous les rôles</option>
          {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={filters.active}
          onChange={e => setFilters(f => ({ ...f, active: e.target.value }))}
          className="input min-w-36 max-w-44 text-sm py-2">
          <option value="">Tous les statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
        {(filters.search || filters.role || filters.active) && (
          <button onClick={() => setFilters({ search: '', role: '', active: '' })}
            className="text-xs text-slate-400 hover:text-slate-700 underline">
            Réinitialiser
          </button>
        )}
        <div className="ml-auto flex border border-slate-200 rounded-lg overflow-hidden">
          {(['list', 'grid'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={`px-3 py-1.5 text-xs transition-colors ${viewMode === m ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {m === 'grid' ? '⊞' : '≡'}
            </button>
          ))}
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔐</div>
          <div className="font-medium text-slate-700 mb-1">Aucun compte</div>
          <div className="text-sm text-slate-400">
            {filters.search || filters.role || filters.active
              ? 'Aucun résultat pour ces filtres.' : 'Aucun compte utilisateur enregistré.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <UserCard
              key={u.id}
              user={u}
              canManage={canManageUser(u)}
              onEdit={() => setEditing(u)}
              onResetPwd={() => setResetting(u)}
              onToggle={() => toggleMutation.mutate({ id: u.id, isActive: !u.is_active })}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Utilisateur', 'Rôle', 'Poste / Service', 'Statut', 'Dernier accès', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${!u.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${ROLE_AVATAR_BG[u.role]}`}>
                          {getInitials(u)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 whitespace-nowrap">
                            {u.prenom} {u.nom}
                          </div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {[u.employee_poste, (u as any).service_nom].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                        ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {fmtDate(u.last_login)}
                    </td>
                    <td className="px-4 py-3">
                      {canManageUser(u) && <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(u)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                          Modifier
                        </button>
                        <button onClick={() => setResetting(u)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
                          title="Réinitialiser le mot de passe">
                          🔑 MDP
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: u.id, isActive: !u.is_active })}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors
                            ${u.is_active
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}>
                          {u.is_active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {filtered.length} compte{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <UserModal
          onClose={() => setShowCreate(false)}
          availableEmployees={availableEmployees}
          allEmployees={employees}
        />
      )}
      {editing && (
        <UserModal
          user={editing}
          onClose={() => setEditing(null)}
          availableEmployees={availableEmployees}
          allEmployees={employees}
        />
      )}
      {resetting && (
        <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />
      )}
    </div>
  );
};
