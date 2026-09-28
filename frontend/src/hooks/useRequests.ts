import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { DemandeDeplacement } from '../types';
import toast from 'react-hot-toast';

interface RequestsParams {
  statut?: string;
  commune_id?: string;
  from?: string;
  to?: string;
  employe_id?: string;
}

export const useRequests = (params?: RequestsParams) => {
  const qp = new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v))
  ).toString();
  return useQuery({
    queryKey: ['requests', params],
    queryFn: () => api.get<{ data: DemandeDeplacement[] }>(`/requests?${qp}`).then(r => r.data.data),
  });
};

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/requests', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      const suggestions = res.data?.groupingSuggestions || [];
      if (suggestions.length > 0) {
        toast.success(`Demande créée. ${suggestions.length} autre(s) demande(s) pour la même commune détectée(s).`, { duration: 6000 });
      } else {
        toast.success('Demande créée avec succès.');
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur lors de la création.'),
  });
};

export const useValidateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vehicule_id, chauffeur_id }: { id: number; vehicule_id?: number; chauffeur_id?: number }) =>
      api.patch(`/requests/${id}/validate`, { vehicule_id, chauffeur_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Demande validée.'); },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Erreur.'),
  });
};

export const useRejectRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.patch(`/requests/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Demande refusée.'); },
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
