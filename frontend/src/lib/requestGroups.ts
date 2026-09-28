import { DemandeDeplacement, DemandeStatut, Passager } from '../types';

/** Normalise une date (ISO, Date, "YYYY-MM-DD…") en "YYYY-MM-DD". */
export const normISO = (d: unknown): string => {
  if (!d) return '';
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
};

/** Date du jour au format "YYYY-MM-DD" (fuseau local). */
export const todayISO = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const fmtTime = (t?: string) => (t ? t.slice(0, 5) : '');

/** Destinations d'une demande, séparées par des virgules. */
export const communesLabel = (r: DemandeDeplacement) =>
  (r.communes?.length ? r.communes.map(c => c.nom) : [r.commune_nom]).join(', ');

/** Une copie de la demande par destination (pour les regroupements par commune). */
export const perDestination = (r: DemandeDeplacement): DemandeDeplacement[] =>
  (r.communes?.length ? r.communes : [{ id: r.commune_id, nom: r.commune_nom }])
    .map(c => ({ ...r, commune_id: c.id, commune_nom: c.nom }));

/**
 * Groupe d'affichage : une demande et ses destinations.
 * Les anciennes demandes multi-destinations, enregistrées en plusieurs lignes,
 * sont regroupées par (initiateur, date, heure de départ, objectif).
 */
export interface RequestGroup {
  key:              string;
  requests:         DemandeDeplacement[];
  employe_id:       number;
  employe_name:     string;
  employe_poste?:   string;
  employe_projet?:  string;
  communes:         { id: number; nom: string }[];
  date_deplacement: string;
  heure_depart:     string;
  heure_retour:     string;
  objectif:         string;
  statut:           DemandeStatut;
  passagers:        Passager[];
  vehicule_id?:     number;
  immatriculation?: string;
  marque?:          string;
  modele?:          string;
  chauffeur_id?:    number;
  chauffeur_name?:  string;
  chauffeur_tel?:   string;
  motif_refus?:     string | null;
}

const groupKey = (r: DemandeDeplacement) =>
  `${r.employe_id}|${normISO(r.date_deplacement)}|${fmtTime(r.heure_depart)}|${r.objectif.trim()}`;

export const groupRequests = (requests: DemandeDeplacement[]): RequestGroup[] => {
  const map = new Map<string, RequestGroup>();
  for (const r of requests) {
    const key = groupKey(r);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        requests:         [],
        employe_id:       r.employe_id,
        employe_name:     r.employe_name,
        employe_poste:    r.employe_poste,
        employe_projet:   r.employe_projet,
        communes:         [],
        date_deplacement: normISO(r.date_deplacement),
        heure_depart:     r.heure_depart,
        heure_retour:     r.heure_retour,
        objectif:         r.objectif,
        statut:           r.statut,
        passagers:        r.passagers || [],
        vehicule_id:      r.vehicule_id,
        immatriculation:  r.immatriculation,
        marque:           r.marque,
        modele:           r.modele,
        chauffeur_id:     r.chauffeur_id,
        chauffeur_name:   r.chauffeur_name,
        chauffeur_tel:    r.chauffeur_tel,
        motif_refus:      r.motif_refus,
      };
      map.set(key, g);
    }
    g.requests.push(r);
    const communes = r.communes?.length ? r.communes : [{ id: r.commune_id, nom: r.commune_nom }];
    for (const c of communes) {
      if (!g.communes.some(x => x.id === c.id)) g.communes.push(c);
    }
  }
  return Array.from(map.values());
};
