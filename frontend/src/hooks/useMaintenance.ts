import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export type MaintenanceStatut = 'planifiee' | 'en_cours' | 'terminee';

export interface Maintenance {
  id:               number;
  vehicule_id:      number;
  immatriculation:  string;
  marque:           string;
  modele:           string;
  km_actuel:        number;
  type_maintenance: string;
  date_debut:       string;
  date_fin?:        string;
  cout?:            number;
  description?:     string;
  statut:           MaintenanceStatut;
  created_at:       string;
}

export const TYPES_MAINTENANCE = [
  'Vidange', 'Révision', 'Réparation',
  'Contrôle technique', 'Changement pneus', 'Batterie', 'Autre',
];

export const MAINTENANCE_STATUT_CFG: Record<MaintenanceStatut, { label: string; color: string; bg: string }> = {
  planifiee: { label: 'Planifiée',   color: 'text-amber-700',   bg: 'bg-amber-100'   },
  en_cours:  { label: 'En cours',    color: 'text-blue-700',    bg: 'bg-blue-100'    },
  terminee:  { label: 'Terminée',    color: 'text-slate-600',   bg: 'bg-slate-100'   },
};

export const useMaintenance = (vehicule_id?: number, statut?: string) => {
  const qp = new URLSearchParams();
  if (vehicule_id) qp.append('vehicule_id', String(vehicule_id));
  if (statut)      qp.append('statut', statut);
  const qs = qp.toString() ? `?${qp}` : '';

  return useQuery({
    queryKey: ['maintenance', vehicule_id, statut],
    queryFn:  () => api.get<{ data: Maintenance[] }>(`/maintenance${qs}`).then(r => r.data.data),
    staleTime: 30_000,
  });
};

export const useCreateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Maintenance>) => api.post('/maintenance', data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Dossier de maintenance créé. Véhicule mis en maintenance.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur.'),
  });
};

export const useUpdateMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Maintenance> }) =>
      api.put(`/maintenance/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Dossier mis à jour.');
    },
  });
};

export const useCloseMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cout, description, next_statut }: {
      id: number; cout?: number; description?: string; next_statut?: string;
    }) => api.patch(`/maintenance/${id}/close`, { cout, description, next_statut }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success(res.data?.message || 'Maintenance clôturée.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur.'),
  });
};

export const useDeleteMaintenance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/maintenance/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      toast.success('Dossier supprimé.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur.'),
  });
};

export const useCompleteRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, km_depart, km_retour }: {
      id: number; km_depart?: number; km_retour?: number;
    }) => api.patch(`/requests/${id}/complete`, { km_depart, km_retour }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      qc.invalidateQueries({ queryKey: ['drivers'] });
      const dist = res.data?.distance;
      toast.success(dist != null
        ? `Mission clôturée — ${dist.toLocaleString('fr-FR')} km parcourus.`
        : 'Mission clôturée avec succès.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur.'),
  });
};
