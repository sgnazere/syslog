import { UserRole, DemandeStatut, VehiculeStatut, ChauffeurStatut } from '../types';

// Rôles UI
export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super-administrateur',
  admin:   'Administrateur',
  manager: 'Manager',
  user:    'Utilisateur',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-slate-800 text-white',
  admin:   'bg-purple-100 text-purple-800',
  manager: 'bg-amber-100  text-amber-800',
  user:    'bg-blue-100   text-blue-800',
};

/** Le super-administrateur dispose de tous les droits d'un administrateur. */
export const hasRole = (role: UserRole | undefined, roles: UserRole[]) =>
  !!role && (roles.includes(role) || (role === 'superadmin' && roles.includes('admin')));

export const isAdminRole = (role: UserRole | undefined) => role === 'admin' || role === 'superadmin';

// Statuts demandes
export const DEMANDE_STATUT_CONFIG: Record<DemandeStatut, { label: string; color: string; bg: string; dot: string }> = {
  en_attente: { label: 'En attente',  color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-400'   },
  validee:    { label: 'Validée',     color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  refusee:    { label: 'Refusée',     color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
  terminee:   { label: 'Terminée',    color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400'   },
};

// Statuts véhicules
export const VEHICULE_STATUT_CONFIG: Record<VehiculeStatut, { label: string; color: string; bg: string }> = {
  disponible:      { label: 'Disponible',     color: 'text-emerald-700', bg: 'bg-emerald-100' },
  en_mission:      { label: 'En mission',     color: 'text-blue-700',    bg: 'bg-blue-100'    },
  en_maintenance:  { label: 'Maintenance',    color: 'text-amber-700',   bg: 'bg-amber-100'   },
  hors_service:    { label: 'Hors service',   color: 'text-red-700',     bg: 'bg-red-100'     },
};

// Statuts chauffeurs
export const CHAUFFEUR_STATUT_CONFIG: Record<ChauffeurStatut, { label: string; color: string; bg: string }> = {
  disponible:    { label: 'Disponible',   color: 'text-emerald-700', bg: 'bg-emerald-100' },
  en_mission:    { label: 'En mission',   color: 'text-blue-700',    bg: 'bg-blue-100'    },
  indisponible:  { label: 'Indisponible', color: 'text-slate-600',   bg: 'bg-slate-100'   },
};

// Catégories de permis de conduire
export const TYPES_PERMIS = ['A', 'B', 'C', 'D', 'E', 'F', 'Toutes catégories'];

// Types de contrat
export const TYPES_CONTRAT = ['CDI', 'CDD', 'Interim', 'Stage', 'Prestataire'];

// Projets de l'organisation
export const PROJETS = [
  'Hiv-free',
  'Yah-fohi',
  'Soutra',
  'Perle et lagune',
  'Pouvoir plus',
  'Inili',
];
