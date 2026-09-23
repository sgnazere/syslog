import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Chauffeur } from '../types';

export const useDrivers = (statut?: string) => useQuery({
  queryKey: ['drivers', statut],
  queryFn: () => {
    const qs = statut ? `?statut=${statut}` : '';
    return api.get<{ data: Chauffeur[] }>(`/drivers${qs}`).then(r => r.data.data);
  },
});

type DriverPayload = Omit<Chauffeur, 'id' | 'name'>;

export const useCreateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: DriverPayload) => api.post('/drivers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Chauffeur ajoute.');
    },
  });
};

export const useUpdateDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DriverPayload }) => api.put(`/drivers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Chauffeur mis a jour.');
    },
  });
};

export const useDeleteDriver = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/drivers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Chauffeur supprime.');
    },
  });
};
