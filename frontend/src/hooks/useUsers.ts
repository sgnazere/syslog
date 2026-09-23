import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { User } from '../types';

export const useUsers = (search?: string) => useQuery({
  queryKey: ['users', search],
  queryFn: () => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return api.get<{ data: User[] }>(`/users${qs}`).then(r => r.data.data || []);
  },
  staleTime: 60_000,
});

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur créé.');
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Utilisateur mis à jour.');
    },
  });
};

export const useToggleUserActive = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => api.patch(`/users/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => api.put(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => toast.success('Mot de passe réinitialisé.'),
  });
};