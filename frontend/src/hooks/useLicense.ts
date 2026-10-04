import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';

export interface LicenceInfo {
  id:              number;
  cle_masquee:     string;
  organisation:    string;
  contact?:        string;
  max_utilisateurs: number;
  max_connexions:  number;
  date_debut:      string;
  date_expiration: string;
  jours_restants:  number;
  is_expired:      boolean;
  statut:          'active' | 'expiree' | 'suspendue';
  modules:         string;
  notes?:          string;
  cree_par?:       string;
  created_at:      string;
}

export interface LicenceStats {
  utilisateurs_actifs: number;
  connexions_actives:  number;
}

export interface Session {
  id:         number;
  prenom:     string;
  nom:        string;
  email:      string;
  role:       string;
  ip_address: string;
  last_seen:  string;
  expires_at: string;
}

export const useLicenseInfo = (enabled = true) =>
  useQuery({
    queryKey: ['license'],
    queryFn:  () =>
      api.get<{ data: LicenceInfo | null; stats: LicenceStats; status: string }>('/license')
         .then(r => r.data),
    staleTime: 30_000,
    retry:     false,
    enabled,
  });

export const useGenerateLicense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      organisation: string; contact?: string; max_utilisateurs: number;
      max_connexions: number; date_expiration: string; notes?: string;
    }) => api.post<{ data: any; message: string }>('/license/generate', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['license'] });
      toast.success(res.data?.message || 'Licence générée.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur lors de la génération.'),
  });
};

export const useActivateLicense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cle: string) => api.post('/license/activate', { cle }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['license'] });
      toast.success(res.data?.message || 'Licence activée avec succès.');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Clé invalide.'),
  });
};

export const useToggleLicenseStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statut }: { id: number; statut: string }) =>
      api.patch(`/license/${id}/status`, { statut }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license'] });
      toast.success('Statut de la licence mis à jour.');
    },
  });
};

export const useSessions = () =>
  useQuery({
    queryKey: ['license-sessions'],
    queryFn:  () => api.get<{ data: Session[]; total: number }>('/license/sessions').then(r => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

export const useKillSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/license/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['license-sessions'] });
      toast.success('Session terminée.');
    },
  });
};
