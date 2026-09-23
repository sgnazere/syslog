// ── Rôles (table users) ──────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'user';

// ── Statuts DB (ENUMs PostgreSQL) ────────────────────────────
export type DemandeStatut    = 'en_attente' | 'validee' | 'refusee' | 'terminee';
export type VehiculeStatut   = 'disponible' | 'en_mission' | 'en_maintenance' | 'hors_service';
export type ChauffeurStatut  = 'disponible' | 'en_mission' | 'indisponible';
export type DeplacementStatut = 'planifie' | 'en_cours' | 'termine' | 'annule';
export type MaintenanceStatut = 'planifiee' | 'en_cours' | 'terminee';

// ── Utilisateur (table users) ────────────────────────────────
export interface User {
  id: number;
  employee_id?: number;
  nom: string;
  prenom: string;
  name: string;          // prenom + nom — calculé par le backend
  email: string;
  role: UserRole;
  is_active: boolean;
  employee_poste?: string;
  employee_projet?: string;
  service_nom?: string;
  last_login?: string;
  date_creation?: string;
  date_modification?: string;
}

// ── Employé (table employees) ────────────────────────────────
export interface Employee {
  id: number;
  nom: string;
  prenoms: string;
  name: string;          // calculé
  email?: string;
  date_naissance?: string;
  poste?: string;
  projet?: string;
  service_id?: number;
  service_nom?: string;
  date_embauche?: string;
  telephone?: string;
  numero_secu?: string;
  numero_urgence?: string;
  type_contrat?: string;
  status: 'actif' | 'inactif';
  date_creation?: string;
  date_modification?: string;
}

// ── Véhicule (table vehicules) ───────────────────────────────
export interface Vehicule {
  id: number;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule: string;
  capacite: number;
  kilometrage?: number;
  annee_mise_service?: number;
  statut: VehiculeStatut;
  energie: 'Diesel' | 'Essence';
}

// ── Chauffeur (table chauffeurs) ─────────────────────────────
export interface Chauffeur {
  id: number;
  nom: string;
  prenoms: string;
  name: string;          // calculé
  numero_permis: string;
  type_permis: string;
  date_expiration_permis: string;
  telephone?: string;
  email?: string;
  statut: ChauffeurStatut;
}

// ── Commune (table communes) ─────────────────────────────────
export interface Commune {
  id: number;
  nom: string;
}

// ── Demande de déplacement (table demande_deplacement) ───────
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  request_id?: string | null;
  created_at: string;
}

export interface DemandeDeplacement {
  id: number;
  employe_id: number;
  employe_name: string;      // calculé
  employe_nom?: string;
  employe_prenoms?: string;
  employe_poste?: string;
  employe_projet?: string;
  commune_id: number;
  commune_nom: string;
  date_deplacement: string;
  heure_depart: string;
  heure_retour: string;
  objectif: string;
  statut: DemandeStatut;
  chauffeur_id?: number;
  chauffeur_name?: string;   // calculé
  chauffeur_tel?: string;
  vehicule_id?: number;
  immatriculation?: string;
  marque?: string;
  modele?: string;
  date_creation: string;
  date_modification: string;
}

// ── Sortie véhicule (table sorties_vehicules) ────────────────
export interface SortieVehicule {
  id: number;
  code_sortie: string;
  vehicule_id: number;
  chauffeur_id: number;
  date_sortie: string;
  heure_depart: string;
  heure_retour: string;
  destination_commune?: string;
  statut: 'planifie' | 'en_cours' | 'termine';
}

// ── Réponses API génériques ──────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  total?: number;
  groupingSuggestions?: Array<{ id: number; employe_name: string; heure_depart: string; heure_retour: string; }>;
}

export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}
