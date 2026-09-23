import { useMemo, useState, useEffect } from 'react';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useServices } from '../hooks/useEmployees';
import { Employee } from '../types';
import { TYPES_CONTRAT, PROJETS } from '../lib/constants';

// ── Badge statut employé ──────────────────────────────────────
const StatusBadge = ({ status }: { status: 'actif' | 'inactif' }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0
    ${status === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'actif' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {status === 'actif' ? 'Actif' : 'Inactif'}
  </span>
);

// ── Initiales ─────────────────────────────────────────────────
const getInitials = (e: Employee) =>
  [e.prenoms, e.nom]
    .filter(Boolean)
    .map(s => s[0].toUpperCase())
    .join('')
    .slice(0, 2) || '?';

// ── État formulaire ───────────────────────────────────────────
const emptyForm = {
  nom:            '',
  prenoms:        '',
  email:          '',
  telephone:      '',
  poste:          '',
  projet:         '',
  service_id:     '',
  type_contrat:   '',
  date_embauche:  '',
  date_naissance: '',
  numero_secu:    '',
  numero_urgence: '',
  status:         'actif' as 'actif' | 'inactif',
};
type EmployeeFormState = typeof emptyForm;

const toForm = (e: Employee): EmployeeFormState => ({
  nom:            e.nom            || '',
  prenoms:        e.prenoms        || '',
  email:          e.email          || '',
  telephone:      e.telephone      || '',
  poste:          e.poste          || '',
  projet:         e.projet         || '',
  service_id:     e.service_id     ? String(e.service_id) : '',
  type_contrat:   e.type_contrat   || '',
  date_embauche:  e.date_embauche  ? e.date_embauche.slice(0, 10)  : '',
  date_naissance: e.date_naissance ? e.date_naissance.slice(0, 10) : '',
  numero_secu:    e.numero_secu    || '',
  numero_urgence: e.numero_urgence || '',
  status:         e.status         || 'actif',
});

const toPayload = (form: EmployeeFormState) => ({
  nom:            form.nom.trim().toUpperCase(),
  prenoms:        form.prenoms.trim(),
  email:          form.email.trim().toLowerCase()  || undefined,
  telephone:      form.telephone.trim()             || undefined,
  poste:          form.poste.trim()                || undefined,
  projet:         form.projet.trim()               || undefined,
  service_id:     form.service_id ? parseInt(form.service_id) : undefined,
  type_contrat:   form.type_contrat                || undefined,
  date_embauche:  form.date_embauche               || undefined,
  date_naissance: form.date_naissance              || undefined,
  numero_secu:    form.numero_secu.trim()          || undefined,
  numero_urgence: form.numero_urgence.trim()       || undefined,
  status:         form.status,
});

// ── Modal création / modification ─────────────────────────────
const EmployeeModal = ({ employee, onClose }: { employee?: Employee | null; onClose: () => void }) => {
  const { data: services = [] } = useServices();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const [form,   setForm]   = useState<EmployeeFormState>(employee ? toForm(employee) : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (key: keyof EmployeeFormState, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.nom.trim())     next.nom     = 'Nom requis';
    if (!form.prenoms.trim()) next.prenoms = 'Prénoms requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = 'Adresse e-mail invalide';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data = toPayload(form);
    if (employee) {
      await updateMutation.mutateAsync({ id: employee.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">
              {employee ? `Modifier ${employee.prenoms} ${employee.nom}` : 'Nouvel employé'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Champs obligatoires marqués *</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Section Identité */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identité</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
                <input value={form.nom} onChange={e => set('nom', e.target.value)}
                  placeholder="KOUASSI" className={`input uppercase ${errors.nom ? 'border-red-400' : ''}`} />
                {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Prénoms *</label>
                <input value={form.prenoms} onChange={e => set('prenoms', e.target.value)}
                  placeholder="Jean Marc" className={`input ${errors.prenoms ? 'border-red-400' : ''}`} />
                {errors.prenoms && <p className="text-xs text-red-500 mt-1">{errors.prenoms}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
                <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
                  placeholder="+225 07 00 00 00 00" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="employe@ong.ci" className={`input ${errors.email ? 'border-red-400' : ''}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de naissance</label>
                <input type="date" value={form.date_naissance}
                  onChange={e => set('date_naissance', e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">N° urgence</label>
                <input value={form.numero_urgence} onChange={e => set('numero_urgence', e.target.value)}
                  placeholder="+225 05 00 00 00 00" className="input" />
              </div>
            </div>
          </div>

          {/* Section Professionnel */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Professionnel</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Poste</label>
                <input value={form.poste} onChange={e => set('poste', e.target.value)}
                  placeholder="Coordinateur terrain" className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Projet</label>
                <select value={form.projet} onChange={e => set('projet', e.target.value)} className="input">
                  <option value="">— Sélectionner un projet —</option>
                  {PROJETS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service</label>
                <select value={form.service_id} onChange={e => set('service_id', e.target.value)} className="input">
                  <option value="">— Sélectionner un service —</option>
                  {(services as any[]).map(s => (
                    <option key={s.id} value={s.id}>{s.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de contrat</label>
                <select value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)} className="input">
                  <option value="">— Sélectionner —</option>
                  {TYPES_CONTRAT.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d'embauche</label>
                <input type="date" value={form.date_embauche}
                  onChange={e => set('date_embauche', e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">N° sécurité sociale</label>
                <input value={form.numero_secu} onChange={e => set('numero_secu', e.target.value)}
                  placeholder="CI-…" className="input" />
              </div>
              {/* Statut — seulement en modification */}
              {employee && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
                  <select value={form.status}
                    onChange={e => set('status', e.target.value as 'actif' | 'inactif')} className="input">
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

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
              : employee ? 'Mettre à jour' : "Créer l'employé"
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal confirmation suppression ────────────────────────────
const DeleteConfirmModal = ({ employee, onConfirm, onCancel, isPending }: {
  employee: Employee;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Supprimer l'employé</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cette action est irréversible.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          Êtes-vous sûr de vouloir supprimer{' '}
          <span className="font-semibold text-slate-900">{employee.prenoms} {employee.nom}</span> ?
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
            {isPending
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Suppression…
                </span>
              : 'Supprimer'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Carte employé ─────────────────────────────────────────────
const EmployeeCard = ({ employee, onEdit, onDelete }: {
  employee: Employee;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="card p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">
        {getInitials(employee)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-slate-900 text-sm truncate">
            {employee.name || `${employee.prenoms} ${employee.nom}`}
          </div>
          <StatusBadge status={employee.status} />
        </div>
        <div className="text-xs text-slate-400 mt-0.5 truncate">
          {[employee.poste, employee.projet].filter(Boolean).join(' — ') || 'Poste non renseigné'}
        </div>
      </div>
    </div>

    <div className="space-y-2 text-sm">
      {employee.service_nom && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Service</span>
          <span className="text-slate-800 truncate max-w-40">{employee.service_nom}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Téléphone</span>
        <span className="text-slate-800">{employee.telephone || '—'}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Email</span>
        <span className="text-slate-800 truncate max-w-40">{employee.email || '—'}</span>
      </div>
      {employee.type_contrat && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Contrat</span>
          <span className="text-slate-800">{employee.type_contrat}</span>
        </div>
      )}
      {employee.date_embauche && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Embauche</span>
          <span className="text-slate-800">
            {new Date(employee.date_embauche).toLocaleDateString('fr-FR')}
          </span>
        </div>
      )}
    </div>

    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
      <button onClick={onEdit} className="btn-secondary flex-1 py-1.5 text-xs">Modifier</button>
      <button onClick={onDelete}
        className="flex-1 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
        Supprimer
      </button>
    </div>
  </div>
);

// ── Page principale ───────────────────────────────────────────
export const EmployeesPage = () => {
  const [filters,    setFilters]    = useState({ status: '', search: '' });
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('grid');
  const [editing,    setEditing]    = useState<Employee | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting,   setDeleting]   = useState<Employee | null>(null);
  const deleteMutation = useDeleteEmployee();

  const { data: employees = [], isLoading } = useEmployees(filters.status || undefined);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e =>
      [e.nom, e.prenoms, e.name, e.email, e.poste, e.projet, e.service_nom, e.telephone]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(q))
    );
  }, [employees, filters.search]);

  const stats = {
    total:    employees.length,
    actifs:   employees.filter(e => e.status === 'actif').length,
    inactifs: employees.filter(e => e.status === 'inactif').length,
    services: new Set(employees.filter(e => e.service_nom).map(e => e.service_nom)).size,
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestion des employés</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} employé{stats.total !== 1 ? 's' : ''} enregistré{stats.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvel employé
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',              val: stats.total,    color: 'text-slate-900'   },
          { label: 'Actifs',             val: stats.actifs,   color: 'text-emerald-600' },
          { label: 'Inactifs',           val: stats.inactifs, color: 'text-red-500'     },
          { label: 'Services distincts', val: stats.services, color: 'text-amber-600'   },
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
          placeholder="Rechercher par nom, poste, projet, service…"
          className="input flex-1 min-w-60 text-sm py-2"
        />
        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="input min-w-36 max-w-44 text-sm py-2"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actifs</option>
          <option value="inactif">Inactifs</option>
        </select>
        {(filters.search || filters.status) && (
          <button
            onClick={() => setFilters({ status: '', search: '' })}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
          >
            Réinitialiser
          </button>
        )}
        <div className="ml-auto flex border border-slate-200 rounded-lg overflow-hidden">
          {(['grid', 'list'] as const).map(m => (
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
          <div className="text-5xl mb-3">👥</div>
          <div className="font-medium text-slate-700 mb-1">Aucun employé</div>
          <div className="text-sm text-slate-400">
            {filters.search || filters.status
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez votre premier employé.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => (
            <EmployeeCard key={e.id} employee={e} onEdit={() => setEditing(e)} onDelete={() => setDeleting(e)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Employé', 'Poste / Projet', 'Service', 'Téléphone', 'Email', 'Contrat', 'Embauche', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {getInitials(e)}
                        </div>
                        <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                          {e.name || `${e.prenoms} ${e.nom}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {[e.poste, e.projet].filter(Boolean).join(' — ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{e.service_nom || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{e.telephone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{e.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{e.type_contrat || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {e.date_embauche ? new Date(e.date_embauche).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(e)}
                          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                          Modifier
                        </button>
                        <button onClick={() => setDeleting(e)}
                          className="text-xs px-2.5 py-1.5 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {filtered.length} employé{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showCreate && <EmployeeModal onClose={() => setShowCreate(false)} />}
      {editing    && <EmployeeModal employee={editing} onClose={() => setEditing(null)} />}
      {deleting   && (
        <DeleteConfirmModal
          employee={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
};
