import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRequests, useCreateRequest, useValidateRequest, useRejectRequest, useCompleteRequest } from '../hooks/useRequests';
import { useVehicles } from '../hooks/useVehicles';
import { useDrivers } from '../hooks/useDrivers';
import { useCommunes } from '../hooks/useCommunes';
import { useActiveEmployees } from '../hooks/useEmployees';
import { Commune, DemandeDeplacement, DemandeStatut, Employee } from '../types';
import { DEMANDE_STATUT_CONFIG, hasRole } from '../lib/constants';
import { groupRequests, normISO, todayISO, perDestination, RequestGroup } from '../lib/requestGroups';


// ── Badge statut ──────────────────────────────────────────────
const StatutBadge = ({ statut }: { statut: DemandeStatut }) => {
  const cfg = DEMANDE_STATUT_CONFIG[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Multi-select passagers ────────────────────────────────────
const PassagersSelect = ({
  employees, excludeId, selected, onChange,
}: {
  employees: Employee[];
  excludeId: string;
  selected: number[];
  onChange: (ids: number[]) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const available = employees.filter(e =>
    String(e.id) !== excludeId &&
    (e.name.toLowerCase().includes(search.toLowerCase()) ||
     (e.poste || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.projet || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.telephone || '').includes(search))
  );

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const removeOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(x => x !== id));
  };

  const selectedEmployees = employees.filter(e => selected.includes(e.id));

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`input min-h-[42px] cursor-pointer flex flex-wrap gap-1.5 items-center ${open ? 'ring-2 ring-primary/30 border-primary' : ''}`}
      >
        {selectedEmployees.length === 0 ? (
          <span className="text-slate-400 text-sm select-none">Sélectionner des passagers…</span>
        ) : (
          selectedEmployees.map(e => (
            <span key={e.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {e.name}
              <button type="button" onClick={(ev) => removeOne(e.id, ev)}
                className="hover:text-red-500 transition-colors ml-0.5 font-bold">×</button>
            </span>
          ))
        )}
        <span className="ml-auto text-slate-400 text-xs select-none">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, poste, projet…"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              onClick={e => e.stopPropagation()} />
          </div>
          {available.length > 0 && (
            <div className="flex gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
              <button type="button" onClick={() => onChange(available.map(e => e.id))}
                className="text-xs text-primary hover:underline">
                Tout sélectionner ({available.length})
              </button>
              {selected.length > 0 && (
                <button type="button" onClick={() => onChange([])}
                  className="text-xs text-red-500 hover:underline ml-2">Tout effacer</button>
              )}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {search ? 'Aucun résultat' : 'Aucun autre employé disponible'}
              </div>
            ) : available.map(e => {
              const isSelected = selected.includes(e.id);
              return (
                <button key={e.id} type="button" onClick={() => toggle(e.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {e.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{e.name}</div>
                    <div className="text-xs text-slate-400 truncate">{[e.poste, e.projet, e.telephone].filter(Boolean).join(' — ')}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              {selected.length} passager{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Multi-select communes ─────────────────────────────────────
const CommunesSelect = ({
  communes, selected, onChange, error,
}: {
  communes: Commune[];
  selected: number[];
  onChange: (ids: number[]) => void;
  error?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const available = communes.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()));

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const removeOne = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(x => x !== id));
  };

  const selectedCommunes = communes.filter(c => selected.includes(c.id));

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className={`input min-h-[42px] cursor-pointer flex flex-wrap gap-1.5 items-center ${error ? 'border-red-400' : ''} ${open ? 'ring-2 ring-primary/30 border-primary' : ''}`}
      >
        {selectedCommunes.length === 0 ? (
          <span className="text-slate-400 text-sm select-none">Sélectionner des communes…</span>
        ) : (
          selectedCommunes.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
              {c.nom}
              <button type="button" onClick={(ev) => removeOne(c.id, ev)}
                className="hover:text-red-500 transition-colors ml-0.5 font-bold">×</button>
            </span>
          ))
        )}
        <span className="ml-auto text-slate-400 text-xs select-none">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une commune…"
              className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              onClick={e => e.stopPropagation()} />
          </div>
          {available.length > 0 && (
            <div className="flex gap-2 px-3 py-1.5 border-b border-slate-100 bg-slate-50">
              <button type="button" onClick={() => onChange(available.map(c => c.id))}
                className="text-xs text-primary hover:underline">
                Tout sélectionner ({available.length})
              </button>
              {selected.length > 0 && (
                <button type="button" onClick={() => onChange([])}
                  className="text-xs text-red-500 hover:underline ml-2">Tout effacer</button>
              )}
            </div>
          )}
          <div className="max-h-56 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                {search ? 'Aucun résultat' : 'Aucune commune disponible'}
              </div>
            ) : available.map(c => {
              const isSelected = selected.includes(c.id);
              return (
                <button key={c.id} type="button" onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                  <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                    {isSelected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {c.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-sm font-medium text-slate-900 truncate">{c.nom}</div>
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500">
              {selected.length} commune{selected.length > 1 ? 's' : ''} sélectionnée{selected.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Modal création demande ────────────────────────────────────
const CreateModal = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const { data: communes  = [] } = useCommunes();
  const { data: employees = [] } = useActiveEmployees();
  const createMutation = useCreateRequest();

  // Un utilisateur simple crée toujours la demande pour lui-même
  const selfOnly = user?.role === 'user';

  const [form, setForm] = useState({
    employe_id:       selfOnly && user?.employee_id ? String(user.employee_id) : '',
    date_deplacement: '',
    heure_depart:     '08:00',
    heure_retour:     '17:00',
    objectif:         '',
  });
  const [passagerIds, setPassagerIds] = useState<number[]>([]);
  const [communeIds,  setCommuneIds]  = useState<number[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const totalPersonnes = 1 + passagerIds.length;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employe_id)        e.employe_id       = selfOnly
      ? "Votre compte n'est lié à aucune fiche employé : contactez un administrateur"
      : 'Employé initiateur requis';
    if (communeIds.length === 0) e.commune_id       = 'Commune requise';
    if (!form.date_deplacement)  e.date_deplacement = 'Date requise';
    if (!form.heure_depart)      e.heure_depart     = 'Heure de départ requise';
    if (!form.heure_retour)      e.heure_retour     = 'Heure de retour requise';
    if (!form.objectif.trim())   e.objectif         = 'Objectif requis';
    if (form.heure_depart && form.heure_retour && form.heure_depart >= form.heure_retour)
      e.heure_retour = "L'heure de retour doit être après le départ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    // Une seule demande, avec toutes ses destinations
    await createMutation.mutateAsync({
      employe_id:       parseInt(form.employe_id, 10),
      commune_ids:      communeIds,
      date_deplacement: form.date_deplacement,
      heure_depart:     form.heure_depart,
      heure_retour:     form.heure_retour,
      objectif:         form.objectif.trim(),
      passager_ids:     passagerIds,
    });
    onClose();
  };

  const today = todayISO();

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">Nouvelle demande de sortie</h2>
            <p className="text-xs text-slate-500 mt-0.5">Champs obligatoires marqués *</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Employé initiateur */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Employé initiateur *</label>
            <select value={form.employe_id} onChange={e => set('employe_id', e.target.value)}
              disabled={selfOnly}
              className={`input ${errors.employe_id ? 'border-red-400' : ''}`}>
              <option value="">Sélectionner l'employé qui initie…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.poste ? ` — ${e.poste}` : ''}
                </option>
              ))}
            </select>
            {errors.employe_id && <p className="text-xs text-red-500 mt-1">{errors.employe_id}</p>}
          </div>

          {/* Passagers */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Passagers / Staff accompagnant
              <span className="ml-1.5 text-xs font-normal text-slate-400">(optionnel — multi-sélection)</span>
            </label>
            <PassagersSelect employees={employees} excludeId={form.employe_id}
              selected={passagerIds} onChange={setPassagerIds} />
            {(passagerIds.length > 0 || form.employe_id) && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <span>👥</span>
                <span>Total mission :</span>
                <span className="font-semibold text-slate-800">{totalPersonnes} personne{totalPersonnes > 1 ? 's' : ''}</span>
                <span className="text-slate-400">(initiateur{passagerIds.length > 0 ? ` + ${passagerIds.length} passager${passagerIds.length > 1 ? 's' : ''}` : ''})</span>
              </div>
            )}
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Objectif de la mission *</label>
            <textarea value={form.objectif} onChange={e => set('objectif', e.target.value)}
              rows={3} placeholder="Décrivez l'objectif de cette sortie…"
              className={`input resize-none ${errors.objectif ? 'border-red-400' : ''}`} />
            {errors.objectif && <p className="text-xs text-red-500 mt-1">{errors.objectif}</p>}
          </div>

          {/* Communes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Communes de destination *
              <span className="ml-1.5 text-xs font-normal text-slate-400">(multi-sélection)</span>
            </label>
            <CommunesSelect communes={communes} selected={communeIds}
              onChange={(ids) => { setCommuneIds(ids); setErrors(e => ({ ...e, commune_id: '' })); }}
              error={!!errors.commune_id} />
            {errors.commune_id && <p className="text-xs text-red-500 mt-1">{errors.commune_id}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date de déplacement *</label>
            <input type="date" value={form.date_deplacement} min={today}
              onChange={e => set('date_deplacement', e.target.value)}
              className={`input ${errors.date_deplacement ? 'border-red-400' : ''}`} />
            {errors.date_deplacement && <p className="text-xs text-red-500 mt-1">{errors.date_deplacement}</p>}
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure départ *</label>
              <input type="time" value={form.heure_depart}
                onChange={e => set('heure_depart', e.target.value)}
                className={`input ${errors.heure_depart ? 'border-red-400' : ''}`} />
              {errors.heure_depart && <p className="text-xs text-red-500 mt-1">{errors.heure_depart}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Heure retour *</label>
              <input type="time" value={form.heure_retour}
                onChange={e => set('heure_retour', e.target.value)}
                className={`input ${errors.heure_retour ? 'border-red-400' : ''}`} />
              {errors.heure_retour && <p className="text-xs text-red-500 mt-1">{errors.heure_retour}</p>}
            </div>
          </div>

          {/* Récap */}
          {form.employe_id && communeIds.length > 0 && form.date_deplacement && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 space-y-1">
              <div className="font-semibold text-blue-900 mb-1.5">📋 Récapitulatif</div>
              <div>👤 Initiateur : <strong>{employees.find(e => String(e.id) === form.employe_id)?.name}</strong></div>
              {passagerIds.length > 0 && (
                <div>👥 Passagers : <strong>{employees.filter(e => passagerIds.includes(e.id)).map(e => e.name).join(', ')}</strong></div>
              )}
              <div>📍 Destinations : <strong>{communes.filter(c => communeIds.includes(c.id)).map(c => c.nom).join(', ')}</strong></div>
              <div>📅 Date : <strong>{new Date(form.date_deplacement + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong></div>
              <div>🕐 Horaire : <strong>{form.heure_depart} → {form.heure_retour}</strong></div>
              <div>👥 Total personnes : <strong>{totalPersonnes}</strong></div>
              {communeIds.length > 1 && (
                <div>📝 Une seule demande pour les {communeIds.length} destinations</div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={handleSubmit} disabled={createMutation.isPending} className="btn-primary flex-1">
            {createMutation.isPending
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Envoi en cours…
                </span>
              : '✓ Soumettre la demande'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal validation — traite tout le groupe d'un coup ────────
const ValidateModal = ({ group, onClose }: { group: RequestGroup; onClose: () => void }) => {
  const { data: vehicles = [] } = useVehicles('disponible');
  const { data: drivers  = [] } = useDrivers('disponible');
  const validateMutation = useValidateRequest();
  const rejectMutation   = useRejectRequest();

  const [vehicule_id,  setVehiculeId]  = useState('');
  const [chauffeur_id, setChauffeurId] = useState('');
  const [rejectMode,   setRejectMode]  = useState(false);
  const [reason,       setReason]      = useState('');
  const [reasonErr,    setReasonErr]   = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalPersonnes = 1 + group.passagers.length;
  const selectedVehicle = vehicles.find(v => String(v.id) === vehicule_id);
  const capaciteOk = !selectedVehicle || selectedVehicle.capacite >= totalPersonnes;

  const handleValidate = async () => {
    // Une demande par groupe ; les anciennes demandes enregistrées en plusieurs lignes
    // sont validées l'une après l'autre, le véhicule et le chauffeur étant affectés à la première.
    for (const [i, r] of group.requests.entries()) {
      await validateMutation.mutateAsync({
        id:           r.id,
        vehicule_id:  i === 0 && vehicule_id  ? parseInt(vehicule_id, 10)  : undefined,
        chauffeur_id: i === 0 && chauffeur_id ? parseInt(chauffeur_id, 10) : undefined,
      });
    }
    onClose();
  };

  const handleReject = async () => {
    if (!reason.trim()) { setReasonErr('Motif obligatoire.'); return; }
    for (const r of group.requests) {
      await rejectMutation.mutateAsync({ id: r.id, reason: reason.trim() });
    }
    onClose();
  };

  const isPending = validateMutation.isPending || rejectMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-slate-900">
              Traiter la demande de {group.employe_name}
            </h2>
            {group.communes.length > 1 && (
              <p className="text-xs text-blue-600 mt-0.5 font-medium">
                {group.communes.length} destinations — une seule mission
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Résumé */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Initiateur</span>
              <span className="font-medium">{group.employe_name}</span>
            </div>

            {group.passagers.length > 0 && (
              <div className="pt-1.5 border-t border-slate-200">
                <div className="text-slate-500 mb-1.5">Passagers ({group.passagers.length}) :</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.passagers.map((p: any) => (
                    <span key={p.id} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                      👤 {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1.5 border-t border-slate-200">
              <div className="text-slate-500 mb-1.5">
                Destination{group.communes.length > 1 ? `s (${group.communes.length})` : ''} :
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.communes.map(c => (
                  <span key={c.id} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    📍 {c.nom}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-1.5 border-t border-slate-200">
              <span className="text-slate-500">Total personnes</span>
              <span className="font-semibold text-slate-900">{totalPersonnes} 👥</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium">
                {new Date(group.date_deplacement + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Horaire</span>
              <span className="font-medium">{group.heure_depart?.slice(0,5)} → {group.heure_retour?.slice(0,5)}</span>
            </div>
            <div className="border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Objectif : </span>
              <span className="text-slate-700">{group.objectif}</span>
            </div>
          </div>

          {!rejectMode ? (
            <>
              {/* Véhicule */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Véhicule <span className="text-slate-400 font-normal">(optionnel — affecter plus tard)</span>
                </label>
                <select value={vehicule_id} onChange={e => setVehiculeId(e.target.value)} className="input">
                  <option value="">— Choisir un véhicule disponible —</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id} disabled={v.capacite < totalPersonnes}>
                      {v.marque} {v.modele} — {v.immatriculation} ({v.capacite} places)
                      {v.capacite < totalPersonnes ? ' ⚠ Insuffisant' : ''}
                    </option>
                  ))}
                </select>
                {selectedVehicle && !capaciteOk && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠ Ce véhicule ({selectedVehicle.capacite} places) est insuffisant pour {totalPersonnes} personnes.
                  </p>
                )}
                {selectedVehicle && capaciteOk && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ Capacité OK ({selectedVehicle.capacite} places pour {totalPersonnes} personnes)
                  </p>
                )}
                {vehicles.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Aucun véhicule disponible</p>
                )}
              </div>

              {/* Chauffeur */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Chauffeur <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <select value={chauffeur_id} onChange={e => setChauffeurId(e.target.value)} className="input">
                  <option value="">— Choisir un chauffeur disponible —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.telephone || 'Tél N/A'} · Cat. {d.type_permis}
                    </option>
                  ))}
                </select>
                {drivers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Aucun chauffeur disponible</p>
                )}
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Motif du refus *</label>
              <textarea value={reason} onChange={e => { setReason(e.target.value); setReasonErr(''); }}
                rows={3} placeholder="Ex : Véhicules indisponibles, mission non prioritaire…"
                className={`input resize-none ${reasonErr ? 'border-red-400' : ''}`} />
              {reasonErr && <p className="text-xs text-red-500 mt-1">{reasonErr}</p>}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-slate-200 flex-shrink-0">
          {!rejectMode ? (
            <>
              <button onClick={() => setRejectMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Refuser
              </button>
              <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleValidate}
                disabled={isPending || (!!vehicule_id && !capaciteOk)}
                className="btn-primary flex-1">
                {isPending ? 'Validation…' : '✓ Valider'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setRejectMode(false)} className="btn-secondary flex-1">← Retour</button>
              <button onClick={handleReject} disabled={isPending}
                className="flex-1 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                {isPending ? 'Refus…' : 'Refuser'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Alerte regroupements inter-personnes ──────────────────────
// Détecte des PERSONNES DIFFÉRENTES allant au même endroit le même jour
const GroupingAlert = ({ requests }: { requests: DemandeDeplacement[] }) => {
  const grouped = useMemo(() => {
    // Regrouper par commune+date, ne garder qu'un représentant par employé
    const acc: Record<string, DemandeDeplacement[]> = {};
    requests.filter(r => r.statut === 'en_attente').flatMap(perDestination).forEach(r => {
      const key = `${r.commune_id}_${normISO(r.date_deplacement)}`;
      if (!acc[key]) acc[key] = [];
      if (!acc[key].some(existing => existing.employe_id === r.employe_id)) {
        acc[key].push(r);
      }
    });
    return Object.values(acc).filter(g => g.length > 1);
  }, [requests]);

  if (grouped.length === 0) return null;

  return (
    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-amber-500 text-xl flex-shrink-0 mt-0.5">🔗</span>
        <div>
          <div className="font-semibold text-amber-800 text-sm mb-1">
            Regroupement possible — {grouped.length} groupe{grouped.length > 1 ? 's' : ''} détecté{grouped.length > 1 ? 's' : ''}
          </div>
          {grouped.map((group, i) => {
            const totalPax = group.reduce((sum, r) => sum + 1 + ((r as any).passagers?.length || 0), 0);
            return (
              <div key={i} className="text-amber-700 text-xs mt-1 p-2 bg-amber-100/60 rounded border border-amber-200">
                <strong>📍 {group[0].commune_nom}</strong> — {new Date(group[0].date_deplacement).toLocaleDateString('fr-FR')}
                {' · '}<strong>{group.length} personnes</strong> — {totalPax} au total
                <div className="mt-1 text-amber-600">
                  Initiateurs : {group.map(r => r.employe_name.split(' ')[0]).join(', ')}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-amber-600 mt-2">
            💡 Vérifiez la capacité du véhicule avant affectation pour regrouper ces sorties.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Modal clôture de mission ──────────────────────────────────
const CloseModal = ({ group, onClose }: { group: RequestGroup; onClose: () => void }) => {
  const completeMutation = useCompleteRequest();
  const [kmDepart,  setKmDepart]  = useState('');
  const [kmRetour,  setKmRetour]  = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const distance = kmDepart && kmRetour && Number(kmRetour) > Number(kmDepart)
    ? Number(kmRetour) - Number(kmDepart)
    : null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!kmDepart) e.kmDepart = 'Kilométrage de départ requis';
    if (!kmRetour) e.kmRetour = 'Kilométrage de retour requis';
    if (kmDepart && kmRetour && Number(kmRetour) < Number(kmDepart))
      e.kmRetour = 'Le kilométrage de retour doit être supérieur au kilométrage de départ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    for (const r of group.requests) {
      await completeMutation.mutateAsync({
        id:        r.id,
        km_depart: parseInt(kmDepart, 10),
        km_retour: parseInt(kmRetour, 10),
      });
    }
    onClose();
  };

  const fmtTime = (t?: string) => t ? t.slice(0, 5) : '';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md flex flex-col">

        {/* En-tête */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="font-semibold text-slate-900">Clôturer la mission</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.employe_name} · {group.communes.map(c => c.nom).join(', ')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Récap de la mission */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium">
                {new Date(group.date_deplacement + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Horaire prévu</span>
              <span className="font-medium">{fmtTime(group.heure_depart)} → {fmtTime(group.heure_retour)}</span>
            </div>
            {group.immatriculation && (
              <div className="flex justify-between">
                <span className="text-slate-500">Véhicule</span>
                <span className="font-medium font-mono">{group.immatriculation}</span>
              </div>
            )}
            {group.chauffeur_name && (
              <div className="flex justify-between">
                <span className="text-slate-500">Chauffeur</span>
                <span className="font-medium">{group.chauffeur_name}</span>
              </div>
            )}
          </div>

          {/* Kilométrages */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Relevé kilométrique
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Km départ *
                </label>
                <input
                  type="number"
                  min="0"
                  value={kmDepart}
                  onChange={e => { setKmDepart(e.target.value); setErrors(er => ({ ...er, kmDepart: '' })); }}
                  placeholder="Ex : 45 000"
                  className={`input ${errors.kmDepart ? 'border-red-400' : ''}`}
                />
                {errors.kmDepart && <p className="text-xs text-red-500 mt-1">{errors.kmDepart}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Km retour *
                </label>
                <input
                  type="number"
                  min="0"
                  value={kmRetour}
                  onChange={e => { setKmRetour(e.target.value); setErrors(er => ({ ...er, kmRetour: '' })); }}
                  placeholder="Ex : 45 320"
                  className={`input ${errors.kmRetour ? 'border-red-400' : ''}`}
                />
                {errors.kmRetour && <p className="text-xs text-red-500 mt-1">{errors.kmRetour}</p>}
              </div>
            </div>

            {/* Distance calculée */}
            {distance != null && (
              <div className="mt-3 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                  Distance parcourue
                </div>
                <span className="font-bold text-emerald-700 text-base">
                  {distance.toLocaleString('fr-FR')} km
                </span>
              </div>
            )}
          </div>

          {/* Avertissement libération */}
          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              La clôture libérera automatiquement le véhicule et le chauffeur.
              Le kilométrage du véhicule sera mis à jour avec la valeur de retour.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={handleSubmit}
            disabled={completeMutation.isPending}
            className="flex-1 py-2 text-sm bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {completeMutation.isPending
              ? <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Clôture en cours…
                </span>
              : '✓ Clôturer la mission'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Carte demande groupée ─────────────────────────────────────
const RequestCard = ({ group, canManage, onManage, onClose }: {
  group: RequestGroup;
  canManage: boolean;
  onManage: () => void;
  onClose:  () => void;
}) => (
  <div className="card p-4 hover:shadow-md transition-shadow flex flex-col">
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <div className="font-medium text-slate-900 text-sm truncate">{group.employe_name}</div>
        <div className="text-xs text-slate-400">{group.employe_poste || group.employe_projet || ''}</div>
      </div>
      <StatutBadge statut={group.statut} />
    </div>

    <div className="space-y-1.5 text-sm flex-1">
      {/* Destinations (tags si multiples) */}
      <div className="flex items-start gap-2 text-slate-600">
        <span className="mt-0.5 flex-shrink-0">📍</span>
        {group.communes.length === 1 ? (
          <span className="font-medium text-slate-800">{group.communes[0].nom}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {group.communes.map(c => (
              <span key={c.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium border border-blue-100">
                {c.nom}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-slate-600">
        <span>📅</span>
        <span>{new Date(group.date_deplacement).toLocaleDateString('fr-FR', { weekday:'short', day:'2-digit', month:'short' })}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-600">
        <span>🕐</span><span>{group.heure_depart?.slice(0,5)} → {group.heure_retour?.slice(0,5)}</span>
      </div>

      {/* Passagers */}
      {group.passagers.length > 0 && (
        <div className="flex items-start gap-2 text-slate-600">
          <span className="mt-0.5">👥</span>
          <div className="flex flex-wrap gap-1">
            {group.passagers.slice(0, 3).map((p: any) => (
              <span key={p.id} className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                {p.name.split(' ')[0]}
              </span>
            ))}
            {group.passagers.length > 3 && (
              <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                +{group.passagers.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 text-slate-500">
        <span className="mt-0.5 flex-shrink-0">📝</span>
        <span className="text-xs line-clamp-2">{group.objectif}</span>
      </div>
    </div>

    {/* Affectation véhicule / chauffeur */}
    {(group.immatriculation || group.chauffeur_name) && (
      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1">
        {group.immatriculation && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <span>🚗</span><span className="font-medium">{group.marque} {group.modele} — {group.immatriculation}</span>
          </div>
        )}
        {group.chauffeur_name && (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <span>🧑‍✈️</span>
            <span className="font-medium">{group.chauffeur_name}</span>
            {group.chauffeur_tel && <span className="text-slate-400">· {group.chauffeur_tel}</span>}
          </div>
        )}
      </div>
    )}

    {group.statut === 'refusee' && group.motif_refus && (
      <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
        Motif du refus : {group.motif_refus}
      </p>
    )}
    {canManage && group.statut === 'en_attente' && (
      <button onClick={onManage}
        className="mt-3 w-full py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
        Traiter{group.communes.length > 1 ? ` (${group.communes.length} destinations)` : ' cette demande'}
      </button>
    )}
    {canManage && group.statut === 'validee' && (
      <button onClick={onClose}
        className="mt-3 w-full py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
        ✓ Clôturer la mission
      </button>
    )}
  </div>
);

// ── Page principale ───────────────────────────────────────────
export const RequestsPage = () => {
  const { user } = useAuth();
  const canManage = hasRole(user?.role, ['admin', 'manager']);

  const [filters,    setFilters]    = useState({ statut: '', from: '', to: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [managing,   setManaging]   = useState<RequestGroup | null>(null);
  const [closing,    setClosing]    = useState<RequestGroup | null>(null);
  const [viewMode,   setViewMode]   = useState<'grid' | 'list'>('grid');

  const { data: requests = [], isLoading } = useRequests({
    statut: filters.statut || undefined,
    from:   filters.from   || undefined,
    to:     filters.to     || undefined,
  });

  // Regrouper les demandes par trajet
  const groups = useMemo(
    () => groupRequests(requests),
    [requests]
  );

  // Stats sur les groupes (pas sur les enregistrements individuels)
  const stats = {
    total:     groups.length,
    enAttente: groups.filter(g => g.statut === 'en_attente').length,
    validees:  groups.filter(g => g.statut === 'validee').length,
    refusees:  groups.filter(g => g.statut === 'refusee').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Demandes de sortie</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats.total} demande{stats.total !== 1 ? 's' : ''}
            {groups.some(g => g.communes.length > 1) && (
              <span className="ml-1 text-blue-500">· dont multi-destinations</span>
            )}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle demande
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',      val: stats.total,     color: 'text-slate-900' },
          { label: 'En attente', val: stats.enAttente, color: 'text-amber-600' },
          { label: 'Validées',   val: stats.validees,  color: 'text-emerald-600' },
          { label: 'Refusées',   val: stats.refusees,  color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Alerte regroupements inter-personnes */}
      {canManage && <GroupingAlert requests={requests} />}

      {/* Filtres */}
      <div className="card p-3 mb-4 flex flex-wrap gap-3 items-center">
        <select value={filters.statut} onChange={e => setFilters(f => ({ ...f, statut: e.target.value }))}
          className="input flex-1 min-w-36 max-w-44 text-sm py-2">
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente</option>
          <option value="validee">Validées</option>
          <option value="refusee">Refusées</option>
          <option value="terminee">Terminées</option>
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Du</span>
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className="input text-sm py-2 w-36" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Au</span>
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className="input text-sm py-2 w-36" />
        </div>
        {(filters.statut || filters.from || filters.to) && (
          <button onClick={() => setFilters({ statut: '', from: '', to: '' })}
            className="text-xs text-slate-400 hover:text-slate-700 underline">Réinitialiser</button>
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
      ) : groups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">📋</div>
          <div className="font-medium text-slate-700 mb-1">Aucune demande</div>
          <div className="text-sm text-slate-400">
            {filters.statut || filters.from || filters.to
              ? 'Aucun résultat pour ces filtres.'
              : 'Créez votre première demande.'}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <RequestCard key={g.key} group={g} canManage={canManage}
              onManage={() => setManaging(g)}
              onClose={() => setClosing(g)} />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Initiateur', 'Passagers', 'Destinations', 'Date', 'Horaire', 'Objectif', 'Affectation', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <tr key={g.key} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{g.employe_name}</div>
                      <div className="text-xs text-slate-400">{g.employe_poste || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      {g.passagers.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {g.passagers.slice(0, 2).map((p: any) => (
                            <span key={p.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {p.name.split(' ')[0]}
                            </span>
                          ))}
                          {g.passagers.length > 2 && (
                            <span className="text-xs text-slate-400">+{g.passagers.length - 2}</span>
                          )}
                        </div>
                      ) : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    {/* Destinations multiples */}
                    <td className="px-4 py-3">
                      {g.communes.length === 1 ? (
                        <span className="text-sm text-slate-700">{g.communes[0].nom}</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {g.communes.map(c => (
                            <span key={c.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                              {c.nom}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {new Date(g.date_deplacement).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                      {g.heure_depart?.slice(0,5)} – {g.heure_retour?.slice(0,5)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs">
                      <div className="line-clamp-2">{g.objectif}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {g.immatriculation ? (
                        <div className="text-emerald-700 space-y-0.5">
                          <div>🚗 {g.immatriculation}</div>
                          {g.chauffeur_name && <div>👤 {g.chauffeur_name}</div>}
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatutBadge statut={g.statut} /></td>
                    <td className="px-4 py-3">
                      {canManage && g.statut === 'en_attente' && (
                        <button onClick={() => setManaging(g)}
                          className="text-xs px-2.5 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors whitespace-nowrap">
                          Traiter{g.communes.length > 1 ? ` (${g.communes.length})` : ''}
                        </button>
                      )}
                      {canManage && g.statut === 'validee' && (
                        <button onClick={() => setClosing(g)}
                          className="text-xs px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap">
                          ✓ Clôturer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {groups.length} demande{groups.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {managing   && <ValidateModal group={managing} onClose={() => setManaging(null)} />}
      {closing    && <CloseModal group={closing} onClose={() => setClosing(null)} />}
    </div>
  );
};
