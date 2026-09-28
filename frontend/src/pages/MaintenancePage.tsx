import { useState, useEffect } from 'react';
import { useVehicles } from '../hooks/useVehicles';
import {
  useMaintenance, useCreateMaintenance, useUpdateMaintenance,
  useCloseMaintenance, useDeleteMaintenance,
  Maintenance, MaintenanceStatut, TYPES_MAINTENANCE, MAINTENANCE_STATUT_CFG,
} from '../hooks/useMaintenance';
import { Vehicule } from '../types';

// ── Helpers ───────────────────────────────────────────────────
const fmtDate = (iso?: string) =>
  iso ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtCost = (n?: number) =>
  n != null ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—';

// ── Badge statut maintenance ──────────────────────────────────
const StatutBadge = ({ statut }: { statut: MaintenanceStatut }) => {
  const cfg = MAINTENANCE_STATUT_CFG[statut];
  const dot = statut === 'en_cours' ? 'bg-blue-500' : statut === 'planifiee' ? 'bg-amber-400' : 'bg-slate-400';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Helpers multi-types ───────────────────────────────────────
/** Sépare "Vidange, Révision" → ['Vidange', 'Révision'] */
const splitTypes = (s?: string): string[] =>
  s ? s.split(',').map(t => t.trim()).filter(Boolean) : [];

/** Réunit ['Vidange', 'Révision'] → "Vidange, Révision" */
const joinTypes = (arr: string[]): string => arr.join(', ');

// ── Modal création / modification ─────────────────────────────
interface MaintenanceFormState {
  vehicule_id:  string;
  types:        string[];   // multi-sélection → stocké en jointure dans type_maintenance
  date_debut:   string;
  date_fin:     string;
  cout:         string;
  description:  string;
  statut:       MaintenanceStatut;
}

const emptyForm: MaintenanceFormState = {
  vehicule_id: '',
  types:       [],
  date_debut:  '',
  date_fin:    '',
  cout:        '',
  description: '',
  statut:      'planifiee',
};

const MaintenanceModal = ({
  maintenance,
  vehicles,
  onClose,
}: {
  maintenance?: Maintenance | null;
  vehicles:     Vehicule[];
  onClose:      () => void;
}) => {
  const createMutation = useCreateMaintenance();
  const updateMutation = useUpdateMaintenance();
  const isEdit = !!maintenance;

  const [form, setForm] = useState<MaintenanceFormState>(maintenance ? {
    vehicule_id: String(maintenance.vehicule_id),
    types:       splitTypes(maintenance.type_maintenance),
    date_debut:  maintenance.date_debut?.slice(0, 10) ?? '',
    date_fin:    maintenance.date_fin?.slice(0, 10)   ?? '',
    cout:        maintenance.cout != null ? String(maintenance.cout) : '',
    description: maintenance.description ?? '',
    statut:      maintenance.statut,
  } : emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const set = (k: keyof MaintenanceFormState, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  /** Coche / décoche un type de maintenance */
  const toggleType = (type: string) => {
    setForm(f => ({
      ...f,
      types: f.types.includes(type)
        ? f.types.filter(t => t !== type)
        : [...f.types, type],
    }));
    setErrors(e => ({ ...e, types: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.vehicule_id)      e.vehicule_id = 'Véhicule requis';
    if (form.types.length === 0) e.types       = 'Sélectionnez au moins un type d\'intervention';
    if (!form.date_debut)       e.date_debut  = 'Date de début requise';
    if (form.date_fin && form.date_debut && form.date_fin < form.date_debut)
      e.date_fin = 'La date de fin doit être après la date de début';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const data = {
      vehicule_id:      parseInt(form.vehicule_id),
      type_maintenance: joinTypes(form.types),   // "Vidange, Révision"
      date_debut:       form.date_debut,
      date_fin:         form.date_fin  || undefined,
      cout:             form.cout      ? parseFloat(form.cout) : undefined,
      description:      form.description.trim() || undefined,
      statut:           form.statut,
    };
    if (isEdit) {
      await updateMutation.mutateAsync({ id: maintenance!.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
    onClose();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">
              {isEdit ? 'Modifier le dossier' : 'Nouveau dossier de maintenance'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Champs obligatoires marqués *</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Véhicule */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Véhicule *</label>
            <select value={form.vehicule_id} onChange={e => set('vehicule_id', e.target.value)}
              className={`input ${errors.vehicule_id ? 'border-red-400' : ''}`}
              disabled={isEdit}>
              <option value="">— Sélectionner un véhicule —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id} disabled={!isEdit && v.statut === 'en_mission'}>
                  {v.marque} {v.modele} — {v.immatriculation}
                  {v.statut !== 'disponible' ? ` (${v.statut})` : ''}
                </option>
              ))}
            </select>
            {errors.vehicule_id && <p className="text-xs text-red-500 mt-1">{errors.vehicule_id}</p>}
          </div>

          {/* Types de maintenance — multi-sélection ───────── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type d'intervention *
              {form.types.length > 0 && (
                <span className="ml-2 text-xs font-normal text-primary">
                  {form.types.length} sélectionné{form.types.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <div className={`grid grid-cols-2 gap-2 p-3 rounded-lg border ${errors.types ? 'border-red-400 bg-red-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
              {TYPES_MAINTENANCE.map(type => {
                const checked = form.types.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all text-sm
                      ${checked
                        ? 'bg-primary/8 border-primary text-primary font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                  >
                    {/* Case à cocher visuelle */}
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors
                      ${checked ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}>
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                    {type}
                  </button>
                );
              })}
            </div>
            {errors.types && <p className="text-xs text-red-500 mt-1">{errors.types}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de début *</label>
              <input type="date" value={form.date_debut} onChange={e => set('date_debut', e.target.value)}
                className={`input ${errors.date_debut ? 'border-red-400' : ''}`} />
              {errors.date_debut && <p className="text-xs text-red-500 mt-1">{errors.date_debut}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de fin prévue</label>
              <input type="date" value={form.date_fin} onChange={e => set('date_fin', e.target.value)}
                className={`input ${errors.date_fin ? 'border-red-400' : ''}`} />
              {errors.date_fin && <p className="text-xs text-red-500 mt-1">{errors.date_fin}</p>}
            </div>
          </div>

          {/* Coût + Statut */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Coût estimé (FCFA)</label>
              <input type="number" min="0" value={form.cout} onChange={e => set('cout', e.target.value)}
                placeholder="Ex : 75 000" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value as MaintenanceStatut)} className="input">
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description / Observations</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Détails de l'intervention, pièces remplacées…"
              className="input resize-none" />
          </div>

          {/* Avertissement */}
          {!isEdit && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              <span>La création d'un dossier de maintenance placera automatiquement le véhicule en statut <strong>En maintenance</strong>.</span>
            </div>
          )}
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
              : isEdit ? 'Mettre à jour' : 'Créer le dossier'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal clôture de maintenance ──────────────────────────────
const CloseMaintenanceModal = ({ maintenance, onClose }: { maintenance: Maintenance; onClose: () => void }) => {
  const closeMutation = useCloseMaintenance();
  const [cout,       setCout]      = useState(maintenance.cout != null ? String(maintenance.cout) : '');
  const [notes,      setNotes]     = useState(maintenance.description ?? '');
  const [nextStatut, setNextStatut] = useState('disponible');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    await closeMutation.mutateAsync({
      id:          maintenance.id,
      cout:        cout ? parseFloat(cout) : undefined,
      description: notes.trim() || undefined,
      next_statut: nextStatut,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-lg">
            ✓
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Clôturer la maintenance</h3>
            <p className="text-xs text-slate-500 mt-0.5">{maintenance.immatriculation}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {splitTypes(maintenance.type_maintenance).map(t => (
                <span key={t} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Coût final (FCFA)</label>
            <input type="number" min="0" value={cout} onChange={e => setCout(e.target.value)}
              placeholder="Ex : 85 000" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes de clôture</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Travaux effectués, pièces remplacées…"
              className="input resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Remettre le véhicule en
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'disponible',  label: 'Disponible',   cls: 'bg-emerald-50 border-emerald-300 text-emerald-700' },
                { value: 'hors_service', label: 'Hors service', cls: 'bg-red-50 border-red-300 text-red-700' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setNextStatut(opt.value)}
                  className={`py-2.5 text-sm rounded-lg border-2 font-medium transition-all
                    ${nextStatut === opt.value ? opt.cls : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={closeMutation.isPending}
            className="flex-1 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            {closeMutation.isPending ? 'Clôture…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Carte maintenance ─────────────────────────────────────────
const MaintenanceCard = ({ m, onEdit, onClose, onDelete }: {
  m:        Maintenance;
  onEdit:   () => void;
  onClose:  () => void;
  onDelete: () => void;
}) => {
  const days = m.date_fin
    ? Math.ceil((new Date(m.date_fin).getTime() - new Date(m.date_debut).getTime()) / 86400000)
    : null;

  return (
    <div className={`card p-4 hover:shadow-md transition-shadow
      ${m.statut === 'en_cours' ? 'border-blue-200' : m.statut === 'planifiee' ? 'border-amber-200' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 text-sm truncate">
            {m.marque} {m.modele}
          </div>
          <div className="text-xs font-mono text-slate-500 mt-0.5">{m.immatriculation}</div>
        </div>
        <StatutBadge statut={m.statut} />
      </div>

      <div className="space-y-2 text-sm mb-4">
        {/* Types — affichés en tags */}
        <div>
          <span className="text-slate-500 text-xs block mb-1.5">Intervention{splitTypes(m.type_maintenance).length > 1 ? 's' : ''}</span>
          <div className="flex flex-wrap gap-1">
            {splitTypes(m.type_maintenance).map(t => (
              <span key={t} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium border border-slate-200">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-xs">Début</span>
          <span className="text-slate-700">{fmtDate(m.date_debut)}</span>
        </div>
        {m.date_fin && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">Fin prévue</span>
            <span className="text-slate-700">
              {fmtDate(m.date_fin)}
              {days != null && days > 0 && <span className="ml-1 text-slate-400">({days}j)</span>}
            </span>
          </div>
        )}
        {m.cout != null && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-xs">Coût</span>
            <span className="font-semibold text-slate-800">{fmtCost(m.cout)}</span>
          </div>
        )}
        {m.description && (
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 line-clamp-2">
            {m.description}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-slate-100">
        {m.statut !== 'terminee' && (
          <button onClick={onClose}
            className="flex-1 py-1.5 text-xs bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
            ✓ Clôturer
          </button>
        )}
        <button onClick={onEdit} className="btn-secondary flex-1 py-1.5 text-xs">Modifier</button>
        {m.statut !== 'en_cours' && (
          <button onClick={onDelete}
            className="py-1.5 px-2.5 text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// ── Page Maintenance ──────────────────────────────────────────
export const MaintenancePage = () => {
  const [filterStatut, setFilterStatut] = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editing,      setEditing]      = useState<Maintenance | null>(null);
  const [closing,      setClosing]      = useState<Maintenance | null>(null);
  const [deleting,     setDeleting]     = useState<Maintenance | null>(null);

  const { data: maintenances = [], isLoading } = useMaintenance(undefined, filterStatut || undefined);
  const { data: vehicles = [] }                = useVehicles();
  const deleteMutation                          = useDeleteMaintenance();

  const stats = {
    total:     maintenances.length,
    en_cours:  maintenances.filter(m => m.statut === 'en_cours').length,
    planifiee: maintenances.filter(m => m.statut === 'planifiee').length,
    terminee:  maintenances.filter(m => m.statut === 'terminee').length,
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
          <h1 className="text-xl font-semibold text-slate-900">Maintenance du parc</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.en_cours} en cours · {stats.planifiee} planifiée{stats.planifiee > 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouveau dossier
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total dossiers', val: stats.total,     color: 'text-slate-900'   },
          { label: 'En cours',       val: stats.en_cours,  color: 'text-blue-600'    },
          { label: 'Planifiées',     val: stats.planifiee, color: 'text-amber-600'   },
          { label: 'Terminées',      val: stats.terminee,  color: 'text-slate-500'   },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre */}
      <div className="card p-3 mb-4 flex gap-3 items-center">
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="input text-sm py-2 min-w-44">
          <option value="">Tous les statuts</option>
          <option value="en_cours">En cours</option>
          <option value="planifiee">Planifiées</option>
          <option value="terminee">Terminées</option>
        </select>
        {filterStatut && (
          <button onClick={() => setFilterStatut('')}
            className="text-xs text-slate-400 hover:text-slate-700 underline">
            Réinitialiser
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
      ) : maintenances.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🔧</div>
          <div className="font-medium text-slate-700 mb-1">Aucun dossier de maintenance</div>
          <div className="text-sm text-slate-400">
            {filterStatut ? 'Aucun résultat pour ce filtre.' : 'Créez le premier dossier de maintenance.'}
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {maintenances.map(m => (
            <MaintenanceCard
              key={m.id}
              m={m}
              onEdit={()   => setEditing(m)}
              onClose={()  => setClosing(m)}
              onDelete={() => setDeleting(m)}
            />
          ))}
        </div>
      )}

      {/* Modal confirmation suppression */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Supprimer le dossier</h3>
            <p className="text-sm text-slate-600 mb-5">
              Supprimer la maintenance <strong>{deleting.type_maintenance}</strong> du véhicule <strong>{deleting.immatriculation}</strong> ?
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={confirmDelete} disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50">
                {deleteMutation.isPending ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && <MaintenanceModal vehicles={vehicles} onClose={() => setShowCreate(false)} />}
      {editing    && <MaintenanceModal maintenance={editing} vehicles={vehicles} onClose={() => setEditing(null)} />}
      {closing    && <CloseMaintenanceModal maintenance={closing} onClose={() => setClosing(null)} />}
    </div>
  );
};
