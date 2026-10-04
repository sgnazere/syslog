import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRequests } from '../hooks/useRequests';
import { useVehicles } from '../hooks/useVehicles';
import { useDrivers } from '../hooks/useDrivers';
import { DemandeDeplacement, Vehicule, Chauffeur } from '../types';
import { exportToXlsx, exportMultiSheetXlsx } from '../lib/xlsxExport';
import { communesLabel, normISO, todayISO } from '../lib/requestGroups';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────

const startOfWeek = () => {
  const now = new Date();
  const d = new Date(now); d.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  d.setHours(0,0,0,0);
  return d.toISOString().split('T')[0];
};
const endOfWeek = () => {
  const s = new Date(startOfWeek());
  s.setDate(s.getDate() + 6);
  return s.toISOString().split('T')[0];
};
const startOfMonth = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().split('T')[0];
};
const endOfMonth = () => {
  const d = new Date(); d.setMonth(d.getMonth() + 1, 0);
  return d.toISOString().split('T')[0];
};

const STATUT_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  validee: 'Validée',
  refusee: 'Refusée',
};

const minutesBetween = (h1: string, h2: string) => {
  const [a1,a2] = h1.split(':').map(Number);
  const [b1,b2] = h2.split(':').map(Number);
  return (b1*60+b2) - (a1*60+a2);
};

// ── Carte rapport (actif) ────────────────────────────────────
const ReportCard = ({
  icon, title, description, indicators, periodLabel, onExport, exporting, count,
}: {
  icon: string; title: string; description: string; indicators: string[];
  periodLabel: string; onExport: () => void; exporting: boolean; count: number;
}) => (
  <div className="card p-5 flex flex-col h-full">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
    </div>

    <div className="flex-1 mb-3">
      <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Contenu inclus</div>
      <ul className="space-y-1">
        {indicators.map((ind, i) => (
          <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
            {ind}
          </li>
        ))}
      </ul>
    </div>

    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
      <div className="text-xs text-slate-400">
        {periodLabel} · <strong className="text-slate-600">{count}</strong> ligne{count !== 1 ? 's' : ''}
      </div>
      <button onClick={onExport} disabled={exporting || count === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
        {exporting ? (
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        Export XLSX
      </button>
    </div>
  </div>
);

// ── Carte rapport (bloqué — données manquantes) ──────────────
const BlockedReportCard = ({ icon, title, description, missingData }: {
  icon: string; title: string; description: string; missingData: string[];
}) => (
  <div className="card p-5 bg-slate-50 border-dashed flex flex-col h-full opacity-75">
    <div className="flex items-start gap-3 mb-3">
      <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center text-xl flex-shrink-0 grayscale">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-slate-600 text-sm">{title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="flex-1">
      <div className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1.5">⚠ Données manquantes</div>
      <ul className="space-y-1">
        {missingData.map((d, i) => (
          <li key={i} className="text-xs text-slate-500 flex items-start gap-1.5">
            <span className="text-amber-500 mt-0.5 flex-shrink-0">○</span>
            Table <code className="bg-slate-200 px-1 rounded text-slate-600">{d}</code>
          </li>
        ))}
      </ul>
    </div>
    <div className="pt-3 mt-3 border-t border-slate-200">
      <span className="inline-block text-xs font-medium text-slate-400 bg-slate-200 px-2.5 py-1 rounded-full">
        Non disponible — structure DB requise
      </span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════
export const ReportsPage = () => {
  const { user } = useAuth();
  const [periodMode, setPeriodMode] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [customFrom, setCustomFrom] = useState(startOfWeek());
  const [customTo,   setCustomTo]   = useState(endOfWeek());
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { from, to, periodLabel } = useMemo(() => {
    switch (periodMode) {
      case 'today': return { from: todayISO(), to: todayISO(), periodLabel: "Aujourd'hui" };
      case 'week':  return { from: startOfWeek(), to: endOfWeek(), periodLabel: 'Cette semaine' };
      case 'month': return { from: startOfMonth(), to: endOfMonth(), periodLabel: 'Ce mois' };
      default:      return { from: customFrom, to: customTo, periodLabel: `${customFrom} → ${customTo}` };
    }
  }, [periodMode, customFrom, customTo]);

  const { data: requests = [] } = useRequests({ from, to });
  const { data: allRequests = [] } = useRequests({}); // pour calculs globaux (mensuel/perf)
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers  = [] } = useDrivers();

  const runExport = async (id: string, fn: () => void) => {
    setExportingId(id);
    try {
      await new Promise(r => setTimeout(r, 300)); // petit délai UX
      fn();
      toast.success('Export généré avec succès.');
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'export.");
    } finally {
      setExportingId(null);
    }
  };

  // ── 1. Rapport journalier ──────────────────────────────────
  const exportDaily = () => {
    const dayReqs = requests.filter(r => periodMode === 'today' ? normISO(r.date_deplacement) === todayISO() : true);
    if (dayReqs.length === 0) throw new Error('Aucune donnée pour cette période.');

    const rows = dayReqs.map(r => ({
      'Date':            r.date_deplacement,
      'Initiateur':      r.employe_name,
      'Poste':           r.employe_poste || '',
      'Commune':         communesLabel(r),
      'Heure départ':    r.heure_depart?.slice(0,5),
      'Heure retour':    r.heure_retour?.slice(0,5),
      'Durée (min)':     minutesBetween(r.heure_depart, r.heure_retour),
      'Objectif':        r.objectif,
      'Statut':          STATUT_LABEL[r.statut] || r.statut,
      'Véhicule':        r.immatriculation ? `${r.marque} ${r.modele} (${r.immatriculation})` : 'Non affecté',
      'Chauffeur':       r.chauffeur_name || 'Non affecté',
      'Passagers':       (r.passagers || []).map(p => p.name).join(', ') || '—',
      'Nb personnes':    1 + (r.passagers?.length || 0),
    }));
    exportToXlsx(rows, 'Rapport journalier', 'rapport_journalier', [12,18,16,14,10,10,10,30,12,28,18,30,10]);
  };

  // ── 2. Rapport hebdo utilisation flotte ────────────────────
  const exportWeeklyFleet = () => {
    if (vehicles.length === 0) throw new Error('Aucun véhicule enregistré.');

    const weekReqs = requests.filter(r => r.statut !== 'refusee');
    const rows = vehicles.map(v => {
      const missions = weekReqs.filter(r => r.vehicule_id === v.id);
      const totalMinutes = missions.reduce((sum, r) => sum + minutesBetween(r.heure_depart, r.heure_retour), 0);
      const periodMinutes = 7 * 24 * 60; // référence semaine
      const tauxUtil = periodMode === 'week' ? Math.min(100, Math.round((totalMinutes / periodMinutes) * 100)) : null;

      return {
        'Véhicule':              `${v.marque} ${v.modele}`,
        'Immatriculation':       v.immatriculation,
        'Capacité':              v.capacite,
        'Statut actuel':         v.statut,
        'Missions réalisées':    missions.length,
        'Temps total mobilisé (h)': Math.round(totalMinutes / 60 * 10) / 10,
        'Taux utilisation (%)':  tauxUtil !== null ? tauxUtil : 'N/A (période ≠ semaine)',
        'Kilométrage actuel':    v.kilometrage || 0,
      };
    });

    const totalVeh = vehicles.length;
    const dispoVeh = vehicles.filter(v => v.statut === 'disponible').length;
    const tauxDispo = Math.round((dispoVeh / totalVeh) * 100);

    const summary = [{
      'Indicateur': 'Taux de disponibilité de la flotte',
      'Valeur': `${tauxDispo}%`,
      'Détail': `${dispoVeh} disponibles sur ${totalVeh} véhicules`,
    }, {
      'Indicateur': 'Chauffeurs disponibles',
      'Valeur': `${drivers.filter(d => d.statut === 'disponible').length} / ${drivers.length}`,
      'Détail': `${Math.round((drivers.filter(d => d.statut === 'disponible').length / (drivers.length||1)) * 100)}% de disponibilité`,
    }, {
      'Indicateur': 'Total missions sur la période',
      'Valeur': weekReqs.length,
      'Détail': periodLabel,
    }];

    exportMultiSheetXlsx([
      { name: 'Utilisation flotte', data: rows, columnWidths: [22,18,10,16,16,20,18,16] },
      { name: 'Indicateurs clés', data: summary, columnWidths: [35,20,40] },
    ], 'rapport_hebdo_flotte');
  };

  // ── 3. Rapport mensuel performance ─────────────────────────
  const exportMonthlyPerf = () => {
    const periodReqs = requests;
    if (periodReqs.length === 0) throw new Error('Aucune donnée pour cette période.');

    const total = periodReqs.length;
    const validees = periodReqs.filter(r => r.statut === 'validee').length;
    const refusees = periodReqs.filter(r => r.statut === 'refusee').length;
    const enAttente = periodReqs.filter(r => r.statut === 'en_attente').length;

    // Délai moyen de traitement (date_creation → date_modification pour validée/refusée)
    const traitees = periodReqs.filter(r => r.statut !== 'en_attente' && r.date_modification);
    const delaisHeures = traitees.map(r => {
      const created = new Date(r.date_creation).getTime();
      const modified = new Date(r.date_modification).getTime();
      return (modified - created) / 3600000;
    });
    const delaiMoyen = delaisHeures.length
      ? Math.round((delaisHeures.reduce((a,b) => a+b, 0) / delaisHeures.length) * 10) / 10
      : null;

    const parCommune: Record<string, number> = {};
    periodReqs.forEach(r => (r.communes?.length ? r.communes.map(c => c.nom) : [r.commune_nom]).forEach(nom => { parCommune[nom] = (parCommune[nom] || 0) + 1; }));

    const summary = [
      { 'Indicateur': 'Volume total de missions', 'Valeur': total },
      { 'Indicateur': 'Missions validées', 'Valeur': validees },
      { 'Indicateur': 'Missions refusées', 'Valeur': refusees },
      { 'Indicateur': 'En attente de traitement', 'Valeur': enAttente },
      { 'Indicateur': "Taux d'approbation (%)", 'Valeur': total ? Math.round((validees/total)*100) : 0 },
      { 'Indicateur': 'Taux de refus (%)', 'Valeur': total ? Math.round((refusees/total)*100) : 0 },
      { 'Indicateur': 'Délai moyen de traitement (h)', 'Valeur': delaiMoyen ?? 'N/A' },
      { 'Indicateur': 'Période analysée', 'Valeur': periodLabel },
    ];

    const parCommuneRows = Object.entries(parCommune)
      .sort((a,b) => b[1]-a[1])
      .map(([commune, count]) => ({ 'Commune': commune, 'Nombre de missions': count, 'Part (%)': Math.round((count/total)*100) }));

    const detail = periodReqs.map(r => ({
      'Date':       r.date_deplacement,
      'Initiateur': r.employe_name,
      'Commune':    communesLabel(r),
      'Statut':     STATUT_LABEL[r.statut] || r.statut,
      'Motif refus': r.statut === 'refusee' ? (r.motif_refus || '—') : '—',
    }));

    exportMultiSheetXlsx([
      { name: 'Indicateurs', data: summary, columnWidths: [38,15] },
      { name: 'Par commune', data: parCommuneRows, columnWidths: [22,18,12] },
      { name: 'Détail missions', data: detail, columnWidths: [12,20,16,14,30] },
    ], 'rapport_mensuel_performance');
  };

  // ── 6. Rapport gestion chauffeurs (partiel) ────────────────
  const exportDrivers = () => {
    if (drivers.length === 0) throw new Error('Aucun chauffeur enregistré.');

    const rows = drivers.map(d => {
      const missions = requests.filter(r => r.chauffeur_id === d.id);
      const totalMinutes = missions.reduce((sum, r) => sum + minutesBetween(r.heure_depart, r.heure_retour), 0);
      return {
        'Chauffeur':            d.name,
        'Téléphone':            d.telephone || '—',
        'Type de permis':       d.type_permis,
        'N° permis':            d.numero_permis,
        'Expiration permis':    d.date_expiration_permis,
        'Statut actuel':        d.statut,
        'Missions sur période': missions.length,
        'Heures mobilisées':    Math.round(totalMinutes / 60 * 10) / 10,
      };
    });
    exportToXlsx(rows, 'Gestion chauffeurs', 'rapport_chauffeurs', [22,16,12,16,16,14,16,16]);
  };

  // ── 9. Planification vs exécution ──────────────────────────
  const exportPlanVsExec = () => {
    if (requests.length === 0) throw new Error('Aucune donnée pour cette période.');

    const rows = requests.map(r => ({
      'Date prévue':     r.date_deplacement,
      'Initiateur':      r.employe_name,
      'Commune':         communesLabel(r),
      'Heure prévue départ': r.heure_depart?.slice(0,5),
      'Heure prévue retour': r.heure_retour?.slice(0,5),
      'Statut final':    STATUT_LABEL[r.statut] || r.statut,
      'Affectée':        r.vehicule_id && r.chauffeur_id ? 'Oui' : 'Non',
      'Écart':           r.statut === 'refusee' ? 'Non exécutée (refusée)'
                        : r.statut === 'en_attente' ? 'En attente de décision'
                        : (!r.vehicule_id || !r.chauffeur_id) ? 'Validée mais non affectée'
                        : 'Conforme',
    }));

    const total = requests.length;
    const conformes = rows.filter(r => r['Écart'] === 'Conforme').length;
    const summary = [
      { 'Indicateur': 'Demandes planifiées', 'Valeur': total },
      { 'Indicateur': 'Exécutées conformément', 'Valeur': conformes },
      { 'Indicateur': 'Taux de conformité (%)', 'Valeur': total ? Math.round((conformes/total)*100) : 0 },
      { 'Indicateur': 'Non exécutées (refusées)', 'Valeur': rows.filter(r => r['Écart'].startsWith('Non exécutée')).length },
      { 'Indicateur': 'En attente', 'Valeur': rows.filter(r => r['Écart'] === 'En attente de décision').length },
    ];

    exportMultiSheetXlsx([
      { name: 'Indicateurs', data: summary, columnWidths: [35,15] },
      { name: 'Détail', data: rows, columnWidths: [14,20,16,16,16,14,12,28] },
    ], 'rapport_planification_execution');
  };

  // ── Compteurs pour affichage cartes ────────────────────────
  const dailyCount = requests.length;
  const fleetCount = vehicles.length;
  const perfCount  = requests.length;
  const driversCount = drivers.length;
  const planCount = requests.length;

  if (user?.role === 'user') {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <div className="font-medium text-slate-700 mb-1">Accès réservé</div>
        <div className="text-sm text-slate-400">Les rapports sont accessibles aux managers et administrateurs.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Rapports & statistiques</h1>
        <p className="text-sm text-slate-500 mt-0.5">Exports XLSX pour analyse et reporting</p>
      </div>

      {/* Sélecteur de période */}
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-slate-700">Période :</span>
        <div className="flex border border-slate-200 rounded-lg overflow-hidden">
          {([
            ['today', "Aujourd'hui"],
            ['week',  'Cette semaine'],
            ['month', 'Ce mois'],
            ['custom','Personnalisée'],
          ] as const).map(([val, label]) => (
            <button key={val} onClick={() => setPeriodMode(val)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${periodMode === val ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {periodMode === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input text-sm py-1.5 w-36" />
            <span className="text-slate-400 text-sm">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input text-sm py-1.5 w-36" />
          </div>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {requests.length} demande{requests.length !== 1 ? 's' : ''} sur la période sélectionnée
        </span>
      </div>

      {/* ── Rapports actifs ─────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <h2 className="text-sm font-semibold text-slate-700">Rapports disponibles</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">

        <ReportCard
          icon="📅" title="Rapport journalier"
          description="Suivi opérationnel quotidien des sorties"
          indicators={[
            'Liste des demandes reçues',
            'Véhicules et chauffeurs affectés',
            'Missions réalisées / refusées / en attente',
            'Passagers par mission',
            'Durée de chaque sortie',
          ]}
          periodLabel={periodLabel} count={dailyCount}
          exporting={exportingId === 'daily'}
          onExport={() => runExport('daily', exportDaily)}
        />

        <ReportCard
          icon="🚗" title="Utilisation de la flotte"
          description="Analyse du niveau d'utilisation des véhicules"
          indicators={[
            'Taux d\'utilisation par véhicule',
            'Missions réalisées par véhicule',
            'Taux de disponibilité flotte',
            'Disponibilité des chauffeurs',
            'Kilométrage actuel',
          ]}
          periodLabel={periodLabel} count={fleetCount}
          exporting={exportingId === 'fleet'}
          onExport={() => runExport('fleet', exportWeeklyFleet)}
        />

        <ReportCard
          icon="📊" title="Performance logistique"
          description="Efficacité globale du service"
          indicators={[
            'Volume total de missions',
            'Taux d\'approbation / refus',
            'Délai moyen de traitement',
            'Répartition par commune',
            'Détail de chaque mission',
          ]}
          periodLabel={periodLabel} count={perfCount}
          exporting={exportingId === 'perf'}
          onExport={() => runExport('perf', exportMonthlyPerf)}
        />

        <ReportCard
          icon="🧑‍✈️" title="Gestion des chauffeurs"
          description="Ressources humaines mobilisées"
          indicators={[
            'Missions par chauffeur',
            'Heures mobilisées',
            'Statut permis de conduire',
            'Disponibilité actuelle',
          ]}
          periodLabel={periodLabel} count={driversCount}
          exporting={exportingId === 'drivers'}
          onExport={() => runExport('drivers', exportDrivers)}
        />

        <ReportCard
          icon="🎯" title="Planification vs exécution"
          description="Capacité d'organisation et respect des délais"
          indicators={[
            'Demandes planifiées vs exécutées',
            'Taux de conformité',
            'Écarts identifiés par mission',
            'Demandes non affectées',
          ]}
          periodLabel={periodLabel} count={planCount}
          exporting={exportingId === 'plan'}
          onExport={() => runExport('plan', exportPlanVsExec)}
        />
      </div>

      {/* ── Rapports bloqués ────────────────────────────────── */}
      <div className="mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <h2 className="text-sm font-semibold text-slate-500">Rapports nécessitant des données supplémentaires</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <BlockedReportCard
          icon="⛽" title="Consommation de carburant"
          description="Contrôle des coûts et anomalies"
          missingData={['consommation_carburant', 'kilometrage_trajets']}
        />

        <BlockedReportCard
          icon="🔧" title="Maintenance et état des véhicules"
          description="Durabilité de la flotte"
          missingData={['maintenance_vehicules (vide)', 'cout_reparations']}
        />

        <BlockedReportCard
          icon="⚠️" title="Incidents et accidents"
          description="Gestion des risques"
          missingData={['incidents_accidents']}
        />

        <BlockedReportCard
          icon="📈" title="Tableau de bord global (KPI complet)"
          description="Coût total, satisfaction utilisateurs"
          missingData={['couts_fonctionnement', 'satisfaction_utilisateurs']}
        />
      </div>

      {/* Note explicative */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        💡 <strong>Note :</strong> Les rapports grisés nécessitent la création de tables supplémentaires dans la base
        de données (suivi carburant, maintenance, incidents). Une fois ces données disponibles, ces rapports
        pourront être activés sur le même modèle.
      </div>
    </div>
  );
};
