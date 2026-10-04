import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Holiday } from '../types';

export const useHolidays = () => useQuery({
  queryKey: ['holidays'],
  queryFn:  () => api.get<{ data: Holiday[] }>('/holidays').then(r => r.data.data),
  staleTime: 5 * 60_000,
});

export const useCreateHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; date: string; recurring: boolean }) => api.post('/holidays', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié ajouté.');
    },
  });
};

export const useDeleteHoliday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Jour férié supprimé.');
    },
  });
};
