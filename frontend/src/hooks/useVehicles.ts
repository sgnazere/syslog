import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Vehicule } from '../types';

export const useVehicles = (statut?: string) => useQuery({
  queryKey: ['vehicles', statut],
  queryFn: () => {
    const qs = statut ? `?statut=${statut}` : '';
    return api.get<{ data: Vehicule[] }>(`/vehicles${qs}`).then(r => r.data.data);
  },
});

type VehiclePayload = Omit<Vehicule, 'id'>;

export const useCreateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VehiclePayload) => api.post('/vehicles', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicule ajoute.');
    },
  });
};

export const useUpdateVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VehiclePayload }) => api.put(`/vehicles/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicule mis a jour.');
    },
  });
};

export const useDeleteVehicle = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/vehicles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehicule supprime.');
    },
  });
};
