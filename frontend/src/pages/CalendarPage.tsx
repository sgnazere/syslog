import { useState, useMemo, useEffect, useRef } from 'react';
import { useRequests } from '../hooks/useRequests';
import { useHolidays } from '../hooks/useHolidays';
import { DemandeStatut } from '../types';
import { DEMANDE_STATUT_CONFIG } from '../lib/constants';
import { groupRequests, normISO, todayISO, fmtTime, RequestGroup } from '../lib/requestGroups';

// ── Internationalisation ──────────────────────────────────────
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

// ── Helpers ───────────────────────────────────────────────────

const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;


const fmtDateLong = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });


const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).map(p => p[0].toUpperCase()).join('').slice(0, 2) || '?';


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

// ── Couleurs des chips par statut ─────────────────────────────
const CHIP_BG: Record<DemandeStatut, string> = {
  en_attente: 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100',
  validee:    'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100',
  refusee:    'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100',
  terminee:   'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200',
};
const CHIP_DOT: Record<DemandeStatut, string> = {
  en_attente: 'bg-amber-400',
  validee:    'bg-emerald-500',
  refusee:    'bg-slate-300',
  terminee:   'bg-slate-500',
};

// ── Tooltip survol ────────────────────────────────────────────
interface TooltipState {
  group: RequestGroup;
  top:   number;
  left:  number;
  flip:  boolean; // afficher au-dessus si trop bas
}

const HoverTooltip = ({ state }: { state: TooltipState }) => {
  const { group, top, left, flip } = state;
  const totalPersonnes = 1 + group.passagers.length;

  return (
    <div
      className="fixed z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl pointer-events-none"
      style={{ top: flip ? top - 4 : top + 4, left, transform: flip ? 'translateY(-100%)' : 'none' }}
    >
      {/* En-tête */}
      <div className="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2.5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {getInitials(group.employe_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-900 truncate">{group.employe_name}</div>
          <div className="text-xs text-slate-500 truncate">
            {[group.employe_poste, group.employe_projet].filter(Boolean).join(' · ') || 'Poste non renseigné'}
          </div>
        </div>
        <StatutBadge statut={group.statut} />
      </div>

      {/* Corps */}
      <div className="px-3.5 py-2.5 space-y-1.5 text-xs">
        {/* Destinations */}
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">📍</span>
          <div className="flex flex-wrap gap-1">
            {group.communes.map(c => (
              <span key={c.id} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                {c.nom}
              </span>
            ))}
          </div>
        </div>

        {/* Horaire */}
        <div className="flex items-center gap-2 text-slate-600">
          <span>🕐</span>
          <span>{fmtTime(group.heure_depart)} → {fmtTime(group.heure_retour)}</span>
          {totalPersonnes > 1 && (
            <span className="ml-auto text-slate-400">
              {totalPersonnes} pers.
            </span>
          )}
        </div>

        {/* Passagers */}
        {group.passagers.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">👥</span>
            <div className="text-slate-600 leading-relaxed">
              {group.passagers.slice(0, 3).map((p: any) => p.name.split(' ')[0]).join(', ')}
              {group.passagers.length > 3 && ` +${group.passagers.length - 3}`}
            </div>
          </div>
        )}

        {/* Objectif */}
        <div className="flex items-start gap-2">
          <span className="flex-shrink-0 mt-0.5">📝</span>
          <span className="text-slate-600 line-clamp-2">{group.objectif}</span>
        </div>
      </div>

      <div className="px-3.5 pb-2.5 text-[10px] text-slate-400 italic">
        Cliquez pour voir tous les détails
      </div>
    </div>
  );
};

// ── Chip de demande ───────────────────────────────────────────
const RequestChip = ({
  group,
  onHover,
  onLeave,
  onClick,
}: {
  group:   RequestGroup;
  onHover: (g: RequestGroup, e: React.MouseEvent) => void;
  onLeave: () => void;
  onClick: (g: RequestGroup) => void;
}) => (
  <button
    type="button"
    onMouseEnter={e => onHover(group, e)}
    onMouseLeave={onLeave}
    onClick={e => { e.stopPropagation(); onClick(group); }}
    className={`w-full text-left flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border
      transition-colors cursor-pointer select-none ${CHIP_BG[group.statut]}`}
  >
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CHIP_DOT[group.statut]}`} />
    <span className="font-medium truncate">{group.employe_name.split(' ')[0]}</span>
    <span className="opacity-60 truncate">
      {group.communes.length === 1 ? group.communes[0].nom : `${group.communes.length} dest.`}
    </span>
  </button>
);

// ── Cellule jour ──────────────────────────────────────────────
const MAX_VISIBLE = 3;

const DayCell = ({
  day, groups, isToday, holiday,
  onHover, onLeave, onGroupClick,
}: {
  day:          number | null;
  groups:       RequestGroup[];
  isToday:      boolean;
  holiday?:     string;
  onHover:      (g: RequestGroup, e: React.MouseEvent) => void;
  onLeave:      () => void;
  onGroupClick: (g: RequestGroup) => void;
}) => {
  const visible  = groups.slice(0, MAX_VISIBLE);
  const overflow = groups.length - MAX_VISIBLE;

  return (
    <div className={`min-h-[100px] p-1.5 border-b border-r border-slate-100 flex flex-col gap-1
      ${!day ? 'bg-slate-50/60' : isToday ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50/50'}
      transition-colors`}
    >
      {day && (
        <>
          {/* Numéro du jour */}
          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold self-start
            ${isToday ? 'bg-primary text-white' : 'text-slate-600'}`}>
            {day}
          </div>
          {holiday && (
            <div className="text-[10px] font-medium text-rose-600 truncate" title={holiday}>🎉 {holiday}</div>
          )}

          {/* Chips des demandes */}
          <div className="flex flex-col gap-0.5 min-w-0">
            {visible.map(g => (
              <RequestChip
                key={g.key}
                group={g}
                onHover={onHover}
                onLeave={onLeave}
                onClick={onGroupClick}
              />
            ))}
            {overflow > 0 && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onGroupClick(groups[MAX_VISIBLE]); }}
                onMouseEnter={e => onHover(groups[MAX_VISIBLE], e)}
                onMouseLeave={onLeave}
                className="text-[11px] text-primary font-medium text-left pl-1 hover:underline"
              >
                +{overflow} autre{overflow > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ── Modal détail complet (au clic) ────────────────────────────
const DetailModal = ({ group, onClose }: { group: RequestGroup; onClose: () => void }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const totalPersonnes = 1 + group.passagers.length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md"
        onClick={e => e.stopPropagation()}>

        {/* En-tête */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 text-sm font-bold
              flex items-center justify-center flex-shrink-0">
              {getInitials(group.employe_name)}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{group.employe_name}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {[group.employe_poste, group.employe_projet].filter(Boolean).join(' — ') || 'Poste non renseigné'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatutBadge statut={group.statut} />
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Corps */}
        <div className="px-5 py-4 space-y-4">
          {/* Date + horaire */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-slate-700">
              <span>📅</span>
              <span className="font-medium">{fmtDateLong(group.date_deplacement)}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <span>🕐</span>
              <span>{fmtTime(group.heure_depart)} → {fmtTime(group.heure_retour)}</span>
            </div>
          </div>

          {/* Destinations */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Destination{group.communes.length > 1 ? `s (${group.communes.length})` : ''}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.communes.map(c => (
                <span key={c.id}
                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded-full font-medium">
                  📍 {c.nom}
                </span>
              ))}
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Participants — {totalPersonnes} personne{totalPersonnes > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* Initiateur */}
              <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
                <span className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[9px] font-bold">
                  {getInitials(group.employe_name)}
                </span>
                {group.employe_name}
                <span className="opacity-60 font-normal">(initiateur)</span>
              </span>
              {/* Passagers */}
              {group.passagers.map((p: any) => (
                <span key={p.id}
                  className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                  <span className="w-4 h-4 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-[9px] font-bold">
                    {getInitials(p.name)}
                  </span>
                  {p.name}
                </span>
              ))}
            </div>
          </div>

          {/* Objectif */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Objectif de la sortie
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{group.objectif}</p>
          </div>

          {/* Affectation */}
          {(group.immatriculation || group.chauffeur_name) && (
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              {group.immatriculation && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span>🚗</span>
                  <span className="font-medium">
                    {group.marque} {group.modele} — {group.immatriculation}
                  </span>
                </div>
              )}
              {group.chauffeur_name && (
                <div className="flex items-center gap-2 text-sm text-emerald-700">
                  <span>🧑‍✈️</span>
                  <span className="font-medium">{group.chauffeur_name}</span>
                  {group.chauffeur_tel && (
                    <span className="text-slate-400 font-normal">· {group.chauffeur_tel}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Page principale ───────────────────────────────────────────
export const CalendarPage = () => {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedGroup, setSelectedGroup] = useState<RequestGroup | null>(null);
  const [tooltip, setTooltip]             = useState<TooltipState | null>(null);

  // Plage du mois affiché
  const lastDay = new Date(year, month + 1, 0).getDate();
  const from    = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const to      = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data: requests = [], isLoading } = useRequests({ from, to });

  // Groupement + index par date
  const groups = useMemo(() => groupRequests(requests), [requests]);

  // Jours fériés (les jours récurrents sont comparés sur le mois et le jour)
  const { data: holidays = [] } = useHolidays();
  const holidayFor = (iso: string) =>
    holidays.find(h => normISO(h.date) === iso || (h.recurring && normISO(h.date).slice(5) === iso.slice(5)))?.name;

  const groupsByDate = useMemo(() => {
    const map: Record<string, RequestGroup[]> = {};
    for (const g of groups) {
      if (g.statut === 'refusee') continue;
      const d = g.date_deplacement; // déjà normalisé en "YYYY-MM-DD"
      if (!map[d]) map[d] = [];
      map[d].push(g);
    }
    return map;
  }, [groups]);

  // Grille calendrier
  const calCells = useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const pad      = firstDow === 0 ? 6 : firstDow - 1;
    const cells: (number | null)[] = Array(pad).fill(null);
    for (let d = 1; d <= lastDay; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month, lastDay]);

  // Navigation mensuelle
  const prevMonth = () => month === 0  ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0))  : setMonth(m => m + 1);
  const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  // Gestion du tooltip au survol
  const handleHover = (g: RequestGroup, e: React.MouseEvent) => {
    const rect  = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const flip  = rect.bottom + 220 > window.innerHeight; // 220px ≈ hauteur du tooltip
    const left  = Math.min(rect.left, window.innerWidth - 296); // 288px largeur + 8px marge
    setTooltip({ group: g, top: flip ? rect.top : rect.bottom, left, flip });
  };
  const handleLeave = () => setTooltip(null);

  const total   = groups.filter(g => g.statut !== 'refusee').length;
  const pending = groups.filter(g => g.statut === 'en_attente').length;
  const valid   = groups.filter(g => g.statut === 'validee').length;

  return (
    <div>
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Calendrier des sorties</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {MONTHS_FR[month]} {year}
            {!isLoading && total > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="text-emerald-600 font-medium">{valid} validée{valid > 1 ? 's' : ''}</span>
                {pending > 0 && (
                  <span className="text-amber-600 font-medium"> · {pending} en attente</span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={prevMonth} className="btn-secondary px-3 py-1.5 text-sm">←</button>
          <button onClick={goToday}   className="btn-secondary px-3 py-1.5 text-xs">Aujourd'hui</button>
          <button onClick={nextMonth} className="btn-secondary px-3 py-1.5 text-sm">→</button>
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 mb-3 text-xs text-slate-500 flex-wrap">
        <span className="font-medium text-slate-400">Légende :</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Validée
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> En attente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Terminée
        </span>
        <span className="flex items-center gap-1.5 text-rose-600">🎉 Jour férié</span>
        <span className="ml-auto text-slate-400 italic hidden sm:block">
          Survolez pour aperçu · Cliquez pour détails
        </span>
      </div>

      {/* Grille calendrier */}
      <div className="card overflow-hidden">
        {/* En-têtes jours */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {DAYS_FR.map(d => (
            <div key={d} className="py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Cellules */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Chargement…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calCells.map((day, i) => {
              const iso = day ? toISO(year, month, day) : '';
              return (
                <DayCell
                  key={i}
                  day={day}
                  groups={iso ? (groupsByDate[iso] ?? []) : []}
                  holiday={iso ? holidayFor(iso) : undefined}
                  isToday={iso === todayISO()}
                  onHover={handleHover}
                  onLeave={handleLeave}
                  onGroupClick={g => { setTooltip(null); setSelectedGroup(g); }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Récap du mois */}
      {!isLoading && groups.length > 0 && (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Sorties ce mois',        val: total,   color: 'text-slate-900'   },
            { label: 'Validées',               val: valid,   color: 'text-emerald-600' },
            { label: 'En attente',             val: pending, color: 'text-amber-600'   },
            { label: 'Destinations distinctes',
              val: new Set(groups.flatMap(g => g.communes.map(c => c.nom))).size,
              color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tooltip au survol */}
      {tooltip && <HoverTooltip state={tooltip} />}

      {/* Modal détail au clic */}
      {selectedGroup && (
        <DetailModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}
    </div>
  );
};
