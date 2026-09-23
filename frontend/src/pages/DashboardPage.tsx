import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../hooks/useRequests';
import { useVehicles } from '../hooks/useVehicles';
import { useDrivers } from '../hooks/useDrivers';
import { DemandeDeplacement, DemandeStatut } from '../types';
import { DEMANDE_STATUT_CONFIG } from '../lib/constants';

// ── Helpers date ──────────────────────────────────────────────
const normISO = (d: any): string => {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  if (d instanceof Date)     return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};
const todayISO  = () => new Date().toISOString().split('T')[0];
const isToday   = (d: string) => normISO(d) === todayISO();
const isThisWeek = (d: string) => {
  const date  = new Date(normISO(d) + 'T00:00:00');
  const now   = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay() + 1); start.setHours(0,0,0,0);
  const end   = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
  return date >= start && date <= end;
};
const fmtDate = (d: string) =>
  new Date(normISO(d) + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtTime = (t?: string) => t ? t.slice(0, 5) : '';

// ── Type groupe de demandes ───────────────────────────────────
interface RequestGroup {
  key:              string;
  requests:         (DemandeDeplacement & { passagers?: any[] })[];
  employe_id:       number;
  employe_name:     string;
  employe_poste?:   string;
  communes:         { id: number; nom: string }[];
  date_deplacement: string;
  heure_depart:     string;
  heure_retour:     string;
  objectif:         string;
  statut:           DemandeStatut;
  passagers:        any[];
  vehicule_id?:     number;
  chauffeur_id?:    number;
  immatriculation?: string;
  marque?:          string;
  modele?:          string;
  chauffeur_name?:  string;
}

const makeGroupKey = (r: DemandeDeplacement) =>
  `${r.employe_id}|${normISO(r.date_deplacement)}|${fmtTime(r.heure_depart)}|${r.objectif.trim()}`;

const groupRequests = (
  requests: (DemandeDeplacement & { passagers?: any[] })[]
): RequestGroup[] => {
  const map = new Map<string, RequestGroup>();
  for (const r of requests) {
    const key = makeGroupKey(r);
    if (!map.has(key)) {
      map.set(key, {
        key,
        requests:         [],
        employe_id:       r.employe_id,
        employe_name:     r.employe_name,
        employe_poste:    r.employe_poste,
        communes:         [],
        date_deplacement: normISO(r.date_deplacement),
        heure_depart:     r.heure_depart,
        heure_retour:     r.heure_retour,
        objectif:         r.objectif,
        statut:           r.statut,
        passagers:        r.passagers || [],
        vehicule_id:      r.vehicule_id,
        chauffeur_id:     r.chauffeur_id,
        immatriculation:  r.immatriculation,
        marque:           r.marque,
        modele:           r.modele,
        chauffeur_name:   r.chauffeur_name,
      });
    }
    const g = map.get(key)!;
    g.requests.push(r);
    if (!g.communes.some(c => c.id === r.commune_id))
      g.communes.push({ id: r.commune_id, nom: r.commune_nom });
  }
  return Array.from(map.values());
};

// ── StatCard ──────────────────────────────────────────────────
const StatCard = ({ icon, value, label, sub, accent, to }: {
  icon: string; value: number | string; label: string; sub?: string; accent?: string; to?: string;
}) => {
  const content = (
    <div className="card p-5 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {to && <span className="text-slate-300 text-xs">→</span>}
      </div>
      <div className={`text-3xl font-bold mb-0.5 ${accent || 'text-slate-900'}`}>{value}</div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};

// ── Badge statut ──────────────────────────────────────────────
const StatutBadge = ({ statut }: { statut: DemandeStatut }) => {
  const cfg = DEMANDE_STATUT_CONFIG[statut];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ── Ligne demande groupée (multi-destinations) ────────────────
const RequestRow = ({ group }: { group: RequestGroup }) => {
  const total = 1 + group.passagers.length;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      {/* Infos employé */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{group.employe_name}</span>
          {total > 1 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
              👥 {total}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 truncate">{group.objectif}</div>
      </div>

      {/* Destinations + date */}
      <div className="text-right flex-shrink-0 space-y-0.5 max-w-[160px]">
        {group.communes.length === 1 ? (
          <div className="text-xs font-medium text-slate-700">📍 {group.communes[0].nom}</div>
        ) : (
          <div className="flex gap-1 flex-wrap justify-end">
            {group.communes.map(c => (
              <span key={c.id} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                {c.nom}
              </span>
            ))}
          </div>
        )}
        <div className="text-xs text-slate-400">
          {fmtDate(group.date_deplacement)} · {fmtTime(group.heure_depart)}
        </div>
      </div>

      <StatutBadge statut={group.statut} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD — LOGISTIQUE / MANAGER / ADMIN
// ═══════════════════════════════════════════════════════════
const LogisticsDashboard = ({ role }: { role: string }) => {
  const { data: requests = [], isLoading: loadingReq } = useRequests({});
  const { data: vehicles = [], isLoading: loadingVeh } = useVehicles();
  const { data: drivers  = [], isLoading: loadingDrv } = useDrivers();

  const isLoading = loadingReq || loadingVeh || loadingDrv;

  const stats = useMemo(() => {
    // ── Groupement : 1 trajet = 1 groupe ─────────────────────
    const allGroups = groupRequests(requests as (DemandeDeplacement & { passagers?: any[] })[]);

    const groupsEnAttente = allGroups.filter(g => g.statut === 'en_attente');
    const groupsValidees  = allGroups.filter(g => g.statut === 'validee');
    const groupsRefusees  = allGroups.filter(g => g.statut === 'refusee');
    const groupsTerminees = allGroups.filter(g => g.statut === 'terminee');

    // Sorties aujourd'hui et cette semaine (hors refusées et terminées)
    const activeStatuts = new Set(['en_attente', 'validee']);
    const today = allGroups.filter(g => activeStatuts.has(g.statut) && isToday(g.date_deplacement));
    const week  = allGroups.filter(g => activeStatuts.has(g.statut) && isThisWeek(g.date_deplacement));

    // Validées sans véhicule ou chauffeur assigné
    const nonAffectees = groupsValidees.filter(g => !g.vehicule_id || !g.chauffeur_id);

    // ── Regroupements inter-personnes (DIFFÉRENTS employés, même commune + date) ──
    // On ignore les demandes du même groupe (même personne multi-destinations)
    const regMap: Record<string, DemandeDeplacement[]> = {};
    requests.filter(r => r.statut === 'en_attente').forEach(r => {
      const key = `${r.commune_id}_${normISO(r.date_deplacement)}`;
      if (!regMap[key]) regMap[key] = [];
      // Un seul représentant par employé (évite les doublons multi-destinations)
      if (!regMap[key].some(existing => existing.employe_id === r.employe_id))
        regMap[key].push(r);
    });
    const regroupements = Object.values(regMap).filter(g => g.length > 1);

    // ── Parc véhicules ──────────────────────────────────────
    const vDispo   = vehicles.filter(v => v.statut === 'disponible').length;
    const vMission = vehicles.filter(v => v.statut === 'en_mission').length;
    const vMaint   = vehicles.filter(v => v.statut === 'en_maintenance' || v.statut === 'hors_service').length;

    // ── Chauffeurs ───────────────────────────────────────────
    const dDispo   = drivers.filter(d => d.statut === 'disponible').length;
    const dMission = drivers.filter(d => d.statut === 'en_mission').length;

    // ── Top communes (30 derniers jours) ─────────────────────
    const last30 = requests.filter(r => {
      const diff = (Date.now() - new Date(normISO(r.date_deplacement) + 'T00:00:00').getTime()) / 86400000;
      return diff <= 30 && diff >= -30;
    });
    const communeCounts: Record<string, number> = {};
    last30.forEach(r => { communeCounts[r.commune_nom] = (communeCounts[r.commune_nom] || 0) + 1; });
    const topCommunes = Object.entries(communeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      allGroups,
      groupsEnAttente, groupsValidees, groupsRefusees, groupsTerminees,
      today, week, nonAffectees, regroupements, topCommunes,
      vDispo, vMission, vMaint, dDispo, dMission,
      totalVehicules: vehicles.length, totalChauffeurs: drivers.length,
    };
  }, [requests, vehicles, drivers]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-2">
        <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Chargement du tableau de bord…
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stats principales ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="⏳" value={stats.groupsEnAttente.length} label="Demandes en attente"
          sub={`${stats.groupsEnAttente.length === 0 ? 'Tout est traité' : 'À traiter'}`}
          accent="text-amber-600" to="/requests" />
        <StatCard icon="🚦" value={stats.nonAffectees.length} label="Validées, non affectées"
          sub="Véhicule/chauffeur à assigner" accent="text-blue-600" to="/requests" />
        <StatCard icon="📅" value={stats.today.length} label="Sorties aujourd'hui"
          sub={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
        <StatCard icon="🗓️" value={stats.week.length} label="Sorties cette semaine" />
      </div>

      {/* ── Alerte regroupements inter-personnes ─────────────── */}
      {stats.regroupements.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">🔗</span>
            <div className="flex-1">
              <div className="font-semibold text-amber-800 text-sm mb-2">
                {stats.regroupements.length} regroupement{stats.regroupements.length > 1 ? 's' : ''} possible{stats.regroupements.length > 1 ? 's' : ''} — plusieurs personnes vers la même destination
              </div>
              <div className="space-y-1.5">
                {stats.regroupements.slice(0, 3).map((g, i) => {
                  const total = g.reduce((sum, r) => sum + 1 + ((r as any).passagers?.length || 0), 0);
                  return (
                    <div key={i} className="text-xs text-amber-700">
                      <strong>📍 {g[0].commune_nom}</strong> — {fmtDate(g[0].date_deplacement)}
                      {' · '}<strong>{g.length} personnes</strong> ({total} au total)
                      <span className="text-amber-600 ml-1">
                        — {g.map(r => r.employe_name.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link to="/requests" className="inline-block mt-2 text-xs font-semibold text-amber-800 hover:underline">
                Voir et traiter →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Grille principale ─────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Colonne gauche */}
        <div className="lg:col-span-2 space-y-5">

          {/* Demandes en attente de validation */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span>⏳</span> Demandes en attente de validation
              </h3>
              {stats.groupsEnAttente.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                  {stats.groupsEnAttente.length}
                </span>
              )}
            </div>
            {stats.groupsEnAttente.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                ✓ Aucune demande en attente
              </div>
            ) : (
              <>
                <div>
                  {stats.groupsEnAttente.slice(0, 5).map(g => (
                    <RequestRow key={g.key} group={g} />
                  ))}
                </div>
                {stats.groupsEnAttente.length > 5 && (
                  <Link to="/requests" className="block text-center text-xs text-primary font-medium mt-3 hover:underline">
                    Voir les {stats.groupsEnAttente.length - 5} autres →
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Validées non affectées */}
          {stats.nonAffectees.length > 0 && (
            <div className="card p-5 border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <span>🚦</span> Validées — affectation véhicule/chauffeur requise
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  {stats.nonAffectees.length}
                </span>
              </div>
              <div>
                {stats.nonAffectees.slice(0, 5).map(g => (
                  <RequestRow key={g.key} group={g} />
                ))}
              </div>
              <Link to="/requests" className="block text-center text-xs text-primary font-medium mt-3 hover:underline">
                Affecter →
              </Link>
            </div>
          )}

          {/* Planning de la semaine */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <span>🗓️</span> Planning de la semaine
            </h3>
            {stats.week.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Aucune sortie planifiée cette semaine
              </div>
            ) : (
              <div>
                {stats.week
                  .sort((a, b) => a.date_deplacement.localeCompare(b.date_deplacement))
                  .slice(0, 8)
                  .map(g => <RequestRow key={g.key} group={g} />)}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-5">

          {/* Parc véhicules */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span>🚗</span> Parc véhicules
              </h3>
              <Link to="/vehicles" className="text-xs text-primary hover:underline">Gérer</Link>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Disponibles',            val: stats.vDispo,   color: 'bg-emerald-400', textColor: 'text-emerald-600' },
                { label: 'En mission',             val: stats.vMission, color: 'bg-blue-400',    textColor: 'text-blue-600'    },
                { label: 'Maintenance / Hors service', val: stats.vMaint, color: 'bg-red-400', textColor: 'text-red-500'   },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${row.color} rounded-full`}
                        style={{ width: `${stats.totalVehicules ? (row.val / stats.totalVehicules) * 100 : 0}%` }} />
                    </div>
                    <span className={`text-sm font-semibold ${row.textColor} w-5 text-right`}>{row.val}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Total flotte</span>
              <span className="font-semibold text-slate-700">{stats.totalVehicules} véhicules</span>
            </div>
          </div>

          {/* Chauffeurs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span>🧑‍✈️</span> Chauffeurs
              </h3>
              <Link to="/drivers" className="text-xs text-primary hover:underline">Gérer</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-emerald-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">{stats.dDispo}</div>
                <div className="text-xs text-emerald-700 mt-0.5">Disponibles</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.dMission}</div>
                <div className="text-xs text-blue-700 mt-0.5">En mission</div>
              </div>
            </div>
          </div>

          {/* Top communes */}
          {stats.topCommunes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3">
                <span>📍</span> Communes les plus demandées
                <span className="text-xs font-normal text-slate-400 ml-auto">30j</span>
              </h3>
              <div className="space-y-2">
                {stats.topCommunes.map(([commune, count], i) => (
                  <div key={commune} className="flex items-center gap-2.5">
                    <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{commune}</span>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / stats.topCommunes[0][1]) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vue d'ensemble admin */}
          {role === 'admin' && (
            <div className="card p-5 bg-slate-900 border-slate-900">
              <h3 className="font-semibold text-white text-sm mb-3">Vue d'ensemble</h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-xl font-bold text-white">{stats.allGroups.length}</div>
                  <div className="text-xs text-slate-400">Demandes totales</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-400">{stats.groupsValidees.length + stats.groupsTerminees.length}</div>
                  <div className="text-xs text-slate-400">Validées / Terminées</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-300">{stats.groupsTerminees.length}</div>
                  <div className="text-xs text-slate-400">Missions terminées</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white">
                    {stats.allGroups.length > 0
                      ? Math.round(((stats.groupsValidees.length + stats.groupsTerminees.length) / stats.allGroups.length) * 100)
                      : 0}%
                  </div>
                  <div className="text-xs text-slate-400">Taux d'approbation</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD — UTILISATEUR (employé)
// ═══════════════════════════════════════════════════════════
const UserDashboard = () => {
  const { data: requests = [], isLoading } = useRequests({});

  const { groups, stats } = useMemo(() => {
    const groups = groupRequests(requests as (DemandeDeplacement & { passagers?: any[] })[]);
    return {
      groups,
      stats: {
        total:     groups.length,
        enAttente: groups.filter(g => g.statut === 'en_attente').length,
        validees:  groups.filter(g => g.statut === 'validee').length,
        terminees: groups.filter(g => g.statut === 'terminee').length,
        refusees:  groups.filter(g => g.statut === 'refusee').length,
        upcoming:  groups
          .filter(g => g.statut !== 'refusee' && g.statut !== 'terminee' && g.date_deplacement >= todayISO())
          .sort((a, b) => a.date_deplacement.localeCompare(b.date_deplacement)),
      },
    };
  }, [requests]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon="📋" value={stats.total}     label="Mes demandes"  to="/requests" />
        <StatCard icon="⏳" value={stats.enAttente} label="En attente"    accent="text-amber-600" />
        <StatCard icon="✅" value={stats.validees + stats.terminees}  label="Validées"     accent="text-emerald-600" />
        <StatCard icon="❌" value={stats.refusees}  label="Refusées"     accent="text-red-500" />
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <span>🗓️</span> Mes prochaines sorties
        </h3>
        {stats.upcoming.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">Aucune sortie à venir</div>
        ) : (
          <div>
            {stats.upcoming.slice(0, 8).map(g => <RequestRow key={g.key} group={g} />)}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ═══════════════════════════════════════════════════════════
export const DashboardPage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">
          {greeting}, {user.prenom} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      {user.role === 'user'
        ? <UserDashboard />
        : <LogisticsDashboard role={user.role} />
      }
    </div>
  );
};
