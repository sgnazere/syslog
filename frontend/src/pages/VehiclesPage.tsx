import { useMemo, useState, useEffect } from 'react';
import { useCreateVehicle, useDeleteVehicle, useUpdateVehicle, useVehicles } from '../hooks/useVehicles';
import { Vehicule, VehiculeStatut } from '../types';
import { VEHICULE_STATUT_CONFIG } from '../lib/constants';

const STATUTS: VehiculeStatut[] = ['disponible', 'en_mission', 'en_maintenance', 'hors_service'];
const ENERGIES = ['Diesel', 'Essence'] as const;

const emptyForm = {
  immatriculation: '',
  marque: '',
  modele: '',
  type_vehicule: '',
  capacite: '5',
  kilometrage: '0',
  annee_mise_service: '',
  statut: 'disponible' as VehiculeStatut,
  energie: 'Diesel' as 'Diesel' | 'Essence',
};

type VehicleFormState = typeof emptyForm;

const StatutBadge = ({ statut }: { statut: VehiculeStatut }) => {
  const cfg = VEHICULE_STATUT_CONFIG[statut];
  const dot =
    statut === 'disponible'     ? 'bg-emerald-500' :
    statut === 'en_mission'     ? 'bg-blue-500'    :
    statut === 'en_maintenance' ? 'bg-amber-500'   : 'bg-red-500';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {cfg.label}
    </span>
  );
};

const toForm = (vehicle: Vehicule): VehicleFormState => ({
  immatriculation:    vehicle.immatriculation || '',
  marque:             vehicle.marque          || '',
  modele:             vehicle.modele          || '',
  type_vehicule:      vehicle.type_vehicule   || '',
  capacite:           String(vehicle.capacite || 1),
  kilometrage:        String(vehicle.kilometrage || 0),
  annee_mise_service: vehicle.annee_mise_service ? String(vehicle.annee_mise_service) : '',
  statut:             vehicle.statut || 'disponible',
  energie:            vehicle.energie || 'Diesel',
});

const toPayload = (form: VehicleFormState) => ({
  immatriculation:    form.immatriculation.trim().toUpperCase(),
  marque:             form.marque.trim(),
  modele:             form.modele.trim(),
  type_vehicule:      form.type_vehicule.trim(),
  capacite:           Number(form.capacite),
  kilometrage:        Number(form.kilometrage || 0),
  annee_mise_service: form.annee_mise_service ? Number(form.annee_mise_service) : undefined,
  statut:             form.statut,
  energie:            form.energie,
});

// ── Modal ajout / modification ────────────────────────────────
const VehicleModal = ({ vehicle, onClose }: { vehicle?: Vehicule | null; onClose: () => void }) => {
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const [form, setForm]     = useState<VehicleFormState>(vehicle ? toForm(vehicle) : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fermeture par Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (key: keyof VehicleFormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: '' }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    const currentYear = new Date().getFullYear() + 1;
    if (!form.immatriculation.trim()) next.immatriculation    = 'Immatriculation requise';
    if (!form.marque.trim())          next.marque             = 'Marque requise';
    if (!form.modele.trim())          next.modele             = 'Modèle requis';
    if (!form.type_vehicule.trim())   next.type_vehicule      = 'Type requis';
    if (!Number(form.capacite) || Number(form.capacite) < 1) next.capacite = 'Capacité invalide';
    if (Number(form.kilometrage) < 0) next.kilometrage = 'Kilométrage invalide';
    if (form.annee_mise_service &&
        (Number(form.annee_mise_service) < 1980 || Number(form.annee_mise_service) > currentYear)) {
      next.annee_mise_service = 'Année invalide';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data = toPayload(form);
    if (vehicle) {
      await updateMutation.mutateAsync({ id: vehicle.id, data });
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
              {vehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Renseignez les informations du véhicule.</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Immatriculation *</label>
              <input value={form.immatriculation} onChange={e => set('immatriculation', e.target.value)}
                placeholder="AA-123-AA" className={`input uppercase ${errors.immatriculation ? 'border-red-400' : ''}`} />
              {errors.immatriculation && <p className="text-xs text-red-500 mt-1">{errors.immatriculation}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type de véhicule *</label>
              <input value={form.type_vehicule} onChange={e => set('type_vehicule', e.target.value)}
                placeholder="SUV, Pick-up, Minibus…" className={`input ${errors.type_vehicule ? 'border-red-400' : ''}`} />
              {errors.type_vehicule && <p className="text-xs text-red-500 mt-1">{errors.type_vehicule}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Marque *</label>
              <input value={form.marque} onChange={e => set('marque', e.target.value)}
                placeholder="Toyota" className={`input ${errors.marque ? 'border-red-400' : ''}`} />
              {errors.marque && <p className="text-xs text-red-500 mt-1">{errors.marque}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Modèle *</label>
              <input value={form.modele} onChange={e => set('modele', e.target.value)}
                placeholder="Hilux" className={`input ${errors.modele ? 'border-red-400' : ''}`} />
              {errors.modele && <p className="text-xs text-red-500 mt-1">{errors.modele}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacité *</label>
              <input type="number" min="1" value={form.capacite} onChange={e => set('capacite', e.target.value)}
                className={`input ${errors.capacite ? 'border-red-400' : ''}`} />
              {errors.capacite && <p className="text-xs text-red-500 mt-1">{errors.capacite}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Énergie</label>
              <select value={form.energie} onChange={e => set('energie', e.target.value)} className="input">
                {ENERGIES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kilométrage</label>
              <input type="number" min="0" value={form.kilometrage} onChange={e => set('kilometrage', e.target.value)}
                className={`input ${errors.kilometrage ? 'border-red-400' : ''}`} />
              {errors.kilometrage && <p className="text-xs text-red-500 mt-1">{errors.kilometrage}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Année de mise en service</label>
              <input type="number" min="1980" value={form.annee_mise_service} onChange={e => set('annee_mise_service', e.target.value)}
                placeholder="2024" className={`input ${errors.annee_mise_service ? 'border-red-400' : ''}`} />
              {errors.annee_mise_service && <p className="text-xs text-red-500 mt-1">{errors.annee_mise_service}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} className="input">
                {STATUTS.map(s => <option key={s} value={s}>{VEHICULE_STATUT_CONFIG[s].label}</option>)}
              </select>
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
              : vehicle ? 'Mettre à jour' : 'Enregistrer'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal confirmation suppression ────────────────────────────
const DeleteConfirmModal = ({ vehicle, onConfirm, onCancel, isPending }: {
  vehicle: Vehicule;
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
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Supprimer le véhicule</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cette action est irréversible.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          Êtes-vous sûr de vouloir supprimer le véhicule{' '}
          <span className="font-semibold text-slate-900">{vehicle.marque} {vehicle.modele}</span>
          {' '}(<span className="font-mono">{vehicle.immatriculation}</span>) ?
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
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

// ── Carte véhicule ────────────────────────────────────────────
const VehicleCard = ({ vehicle, onEdit, onDelete }: {
  vehicle: Vehicule;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <div className="card p-4 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="font-semibold text-slate-900 truncate">{vehicle.marque} {vehicle.modele}</div>
        <div className="text-xs text-slate-400 mt-0.5">{vehicle.type_vehicule || 'Type non renseigné'}</div>
      </div>
      <StatutBadge statut={vehicle.statut} />
    </div>
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Immatriculation</span>
        <span className="font-mono text-slate-900 font-semibold">{vehicle.immatriculation}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Capacité</span>
        <span className="text-slate-800">{vehicle.capacite} places</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Énergie</span>
        <span className="text-slate-800">{vehicle.energie}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-500">Kilométrage</span>
        <span className="text-slate-800">{Number(vehicle.kilometrage || 0).toLocaleString('fr-FR')} km</span>
      </div>
    </div>
    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
      <button onClick={onEdit} className="btn-secondary flex-1 py-1.5 text-xs">Modifier</button>
      <button
        onClick={onDelete}
        className="flex-1 py-1.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
      >
        Supprimer
      </button>
    </div>
  </div>
);

// ── Page principale ───────────────────────────────────────────
export const VehiclesPage = () => {
  const [filters,    setFilters]    = useState({ statut: '', search: '' });
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('grid');
  const [editing,    setEditing]    = useState<Vehicule | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deleting,   setDeleting]   = useState<Vehicule | null>(null);
  const deleteMutation = useDeleteVehicle();

  const { data: vehicles = [], isLoading } = useVehicles(filters.statut || undefined);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(v =>
      [v.immatriculation, v.marque, v.modele, v.type_vehicule, v.energie]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(q))
    );
  }, [vehicles, filters.search]);

  const stats = {
    total:        vehicles.length,
    disponible:   vehicles.filter(v => v.statut === 'disponible').length,
    mission:      vehicles.filter(v => v.statut === 'en_mission').length,
    indisponible: vehicles.filter(v => v.statut === 'en_maintenance' || v.statut === 'hors_service').length,
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteMutation.mutateAsync(deleting.id);
    setDeleting(null);
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Gestion du parc</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} véhicule{stats.total !== 1 ? 's' : ''} enregistré{stats.total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau véhicule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',         val: stats.total,        color: 'text-slate-900' },
          { label: 'Disponibles',   val: stats.disponible,   color: 'text-emerald-600' },
          { label: 'En mission',    val: stats.mission,      color: 'text-blue-600' },
          { label: 'Indisponibles', val: stats.indisponible, color: 'text-red-500' },
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
          placeholder="Rechercher par immatriculation, marque, modèle…"
          className="input flex-1 min-w-60 text-sm py-2"
        />
        <select
          value={filters.statut}
          onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
          className="input min-w-44 max-w-52 text-sm py-2"
        >
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{VEHICULE_STATUT_CONFIG[s].label}</option>)}
        </select>
        {(filters.search || filters.statut) && (
          <button
            onClick={() => setFilters({ statut: '', search: '' })}
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
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Chargement…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🚗</div>
          <div className="font-medium text-slate-700 mb-1">Aucun véhicule</div>
          <div className="text-sm text-slate-400">
            {filters.search || filters.statut
              ? 'Aucun résultat pour ces filtres.'
              : 'Enregistrez votre premier véhicule.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <VehicleCard key={v.id} vehicle={v} onEdit={() => setEditing(v)} onDelete={() => setDeleting(v)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Véhicule', 'Immatriculation', 'Type', 'Capacité', 'Énergie', 'Kilométrage', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{v.marque} {v.modele}</div>
                      <div className="text-xs text-slate-400">{v.annee_mise_service || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono font-semibold text-slate-800 whitespace-nowrap">{v.immatriculation}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{v.type_vehicule || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{v.capacite} places</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{v.energie}</td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {Number(v.kilometrage || 0).toLocaleString('fr-FR')} km
                    </td>
                    <td className="px-4 py-3"><StatutBadge statut={v.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(v)} className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50">
                          Modifier
                        </button>
                        <button onClick={() => setDeleting(v)} className="text-xs px-2.5 py-1.5 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100">
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
            {filtered.length} véhicule{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showCreate && <VehicleModal onClose={() => setShowCreate(false)} />}
      {editing    && <VehicleModal vehicle={editing} onClose={() => setEditing(null)} />}
      {deleting   && (
        <DeleteConfirmModal
          vehicle={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
};
