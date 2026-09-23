import { useMemo, useState } from 'react';
import { useCreateDriver, useDeleteDriver, useDrivers, useUpdateDriver } from '../hooks/useDrivers';
import { Chauffeur, ChauffeurStatut } from '../types';
import { CHAUFFEUR_STATUT_CONFIG, TYPES_PERMIS } from '../lib/constants';

const STATUTS: ChauffeurStatut[] = ['disponible', 'en_mission', 'indisponible'];

const emptyForm = {
  nom: '',
  prenoms: '',
  numero_permis: '',
  type_permis: 'B',  // valeur par défaut la plus courante
  date_expiration_permis: '',
  telephone: '',
  email: '',
  statut: 'disponible' as ChauffeurStatut,
};

type DriverFormState = typeof emptyForm;

const StatutBadge = ({ statut }: { statut: ChauffeurStatut }) => {
  const cfg = CHAUFFEUR_STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${statut === 'disponible' ? 'bg-emerald-500' : statut === 'en_mission' ? 'bg-blue-500' : 'bg-slate-500'}`} />
      {cfg.label}
    </span>
  );
};

const toForm = (driver: Chauffeur): DriverFormState => ({
  nom: driver.nom || '',
  prenoms: driver.prenoms || '',
  numero_permis: driver.numero_permis || '',
  type_permis: driver.type_permis || 'B',
  date_expiration_permis: driver.date_expiration_permis ? driver.date_expiration_permis.slice(0, 10) : '',
  telephone: driver.telephone || '',
  email: driver.email || '',
  statut: driver.statut || 'disponible',
});

const toPayload = (form: DriverFormState) => ({
  nom: form.nom.trim(),
  prenoms: form.prenoms.trim(),
  numero_permis: form.numero_permis.trim().toUpperCase(),
  type_permis: form.type_permis,
  date_expiration_permis: form.date_expiration_permis,
  telephone: form.telephone.trim() || undefined,
  email: form.email.trim().toLowerCase() || undefined,
  statut: form.statut,
});

const isExpired = (date: string) => {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
};

const DriverModal = ({
  driver,
  onClose,
}: {
  driver?: Chauffeur | null;
  onClose: () => void;
}) => {
  const createMutation = useCreateDriver();
  const updateMutation = useUpdateDriver();
  const [form, setForm] = useState<DriverFormState>(driver ? toForm(driver) : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof DriverFormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.nom.trim())     next.nom               = 'Nom requis';
    if (!form.prenoms.trim()) next.prenoms            = 'Prénoms requis';
    if (!form.numero_permis.trim()) next.numero_permis = 'Numéro de permis requis';
    if (!form.type_permis)    next.type_permis        = 'Catégorie de permis requise';
    if (!form.date_expiration_permis) next.date_expiration_permis = 'Date d\'expiration requise';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Email invalide';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data = toPayload(form);
    if (driver) {
      await updateMutation.mutateAsync({ id: driver.id, data });
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
            <h2 className="font-semibold text-slate-900">{driver ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Renseignez les informations de la table chauffeurs.</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom *</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)}
                placeholder="Kouassi" className={`input uppercase ${errors.nom ? 'border-red-400' : ''}`} />
              {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Prenoms *</label>
              <input value={form.prenoms} onChange={e => set('prenoms', e.target.value)}
                placeholder="Jean Marc" className={`input ${errors.prenoms ? 'border-red-400' : ''}`} />
              {errors.prenoms && <p className="text-xs text-red-500 mt-1">{errors.prenoms}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Numéro de permis *</label>
              <input value={form.numero_permis} onChange={e => set('numero_permis', e.target.value)}
                placeholder="CI-123456" className={`input uppercase ${errors.numero_permis ? 'border-red-400' : ''}`} />
              {errors.numero_permis && <p className="text-xs text-red-500 mt-1">{errors.numero_permis}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Catégorie de permis *</label>
              <select value={form.type_permis} onChange={e => set('type_permis', e.target.value)}
                className={`input ${errors.type_permis ? 'border-red-400' : ''}`}>
                <option value="">— Sélectionner —</option>
                {TYPES_PERMIS.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              {errors.type_permis && <p className="text-xs text-red-500 mt-1">{errors.type_permis}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d'expiration *</label>
              <input type="date" value={form.date_expiration_permis} onChange={e => set('date_expiration_permis', e.target.value)}
                className={`input ${errors.date_expiration_permis ? 'border-red-400' : ''}`} />
              {errors.date_expiration_permis && <p className="text-xs text-red-500 mt-1">{errors.date_expiration_permis}</p>}
              {form.date_expiration_permis && isExpired(form.date_expiration_permis) && (
                <p className="text-xs text-amber-600 mt-1">⚠ Permis expiré — vérifiez avant toute affectation.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} className="input">
                {STATUTS.map(s => <option key={s} value={s}>{CHAUFFEUR_STATUT_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Téléphone</label>
              <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
                placeholder="+225 07 00 00 00 00" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="chauffeur@ong.ci" className={`input ${errors.email ? 'border-red-400' : ''}`} />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={isSaving} className="btn-primary flex-1">
            {isSaving ? 'Enregistrement...' : driver ? 'Mettre a jour' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DriverCard = ({
  driver,
  onEdit,
  onDelete,
}: {
  driver: Chauffeur;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="card p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 truncate">{driver.name || `${driver.prenoms} ${driver.nom}`}</div>
        <div className="text-xs text-slate-400 mt-0.5">{driver.telephone || 'Telephone non renseigne'}</div>
      </div>
      <StatutBadge statut={driver.statut} />
    </div>
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Permis</span>
        <span className="font-mono text-slate-900 font-semibold">{driver.numero_permis}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Catégorie</span>
        <span className="text-slate-800">{driver.type_permis}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Expiration</span>
        <span className={isExpired(driver.date_expiration_permis) ? 'text-red-600 font-medium' : 'text-slate-800'}>
          {new Date(driver.date_expiration_permis).toLocaleDateString('fr-FR')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Email</span>
        <span className="text-slate-800 truncate max-w-40">{driver.email || '-'}</span>
      </div>
    </div>
    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
      <button onClick={onEdit} className="btn-secondary flex-1 py-1.5 text-xs">Modifier</button>
      <button onClick={onDelete} className="flex-1 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
        Supprimer
      </button>
    </div>
  </div>
);

export const DriversPage = () => {
  const [filters, setFilters] = useState({ statut: '', search: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [editing, setEditing] = useState<Chauffeur | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const deleteMutation = useDeleteDriver();

  const { data: drivers = [], isLoading } = useDrivers(filters.statut || undefined);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return drivers;
    return drivers.filter(d =>
      [d.nom, d.prenoms, d.name, d.numero_permis, d.type_permis, d.telephone, d.email]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    );
  }, [drivers, filters.search]);

  const stats = {
    total: drivers.length,
    disponible: drivers.filter(d => d.statut === 'disponible').length,
    mission: drivers.filter(d => d.statut === 'en_mission').length,
    indisponible: drivers.filter(d => d.statut === 'indisponible').length,
    expires: drivers.filter(d => isExpired(d.date_expiration_permis)).length,
  };

  const handleDelete = async (driver: Chauffeur) => {
    if (!window.confirm(`Supprimer le chauffeur ${driver.name || `${driver.prenoms} ${driver.nom}`} ?`)) return;
    await deleteMutation.mutateAsync(driver.id);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestion des chauffeurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">{stats.total} chauffeur{stats.total !== 1 ? 's' : ''} enregistre{stats.total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau chauffeur
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total', val: stats.total, color: 'text-slate-900' },
          { label: 'Disponibles', val: stats.disponible, color: 'text-emerald-600' },
          { label: 'En mission', val: stats.mission, color: 'text-blue-600' },
          { label: 'Indisponibles', val: stats.indisponible, color: 'text-slate-600' },
          { label: 'Permis expirés', val: stats.expires, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
        <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Rechercher nom, numéro de permis, téléphone…" className="input flex-1 min-w-60 text-sm py-2" />
        <select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
          className="input min-w-44 max-w-52 text-sm py-2">
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{CHAUFFEUR_STATUT_CONFIG[s].label}</option>)}
        </select>
        {(filters.search || filters.statut) && (
          <button onClick={() => setFilters({ statut: '', search: '' })}
            className="text-xs text-slate-400 hover:text-slate-700 underline">Reinitialiser</button>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Chargement...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">👤</div>
          <div className="font-medium text-slate-700 mb-1">Aucun chauffeur</div>
          <div className="text-sm text-slate-400">
            {filters.search || filters.statut ? 'Aucun resultat pour ces filtres.' : 'Enregistrez votre premier chauffeur.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <DriverCard key={d.id} driver={d} onEdit={() => setEditing(d)} onDelete={() => handleDelete(d)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Chauffeur', 'N° Permis', 'Catégorie', 'Expiration', 'Téléphone', 'Email', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{d.name || `${d.prenoms} ${d.nom}`}</div>
                      <div className="text-xs text-slate-400">{d.nom}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-800 whitespace-nowrap">{d.numero_permis}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{d.type_permis}</td>
                    <td className={`px-4 py-3 text-sm whitespace-nowrap ${isExpired(d.date_expiration_permis) ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                      {new Date(d.date_expiration_permis).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{d.telephone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{d.email || '-'}</td>
                    <td className="px-4 py-3"><StatutBadge statut={d.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(d)} className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">Modifier</button>
                        <button onClick={() => handleDelete(d)} className="text-xs px-2.5 py-1.5 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {filtered.length} chauffeur{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showCreate && <DriverModal onClose={() => setShowCreate(false)} />}
      {editing && <DriverModal driver={editing} onClose={() => setEditing(null)} />}
    </div>
  );
};
