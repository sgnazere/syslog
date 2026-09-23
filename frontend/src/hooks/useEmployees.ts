import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { Employee } from '../types';

// Hook pour la liste des employés actifs (utilisé dans RequestsPage, UsersPage)
export const useActiveEmployees = () => useQuery({
  queryKey: ['employees-actifs'],
  queryFn: () => api.get<{ data: Employee[] }>('/users/employees').then(r => r.data.data || r.data || []),
  staleTime: 60_000,
});

export const useEmployees = (statut?: string, search?: string) => useQuery({
  queryKey: ['employees', statut, search],
  queryFn: () => {
    const params = new URLSearchParams();
    if (statut) params.append('statut', statut);
    if (search) params.append('search', search);
    const qs = params.toString() ? `?${params}` : '';
    return api.get<{ data: Employee[] }>(`/employees${qs}`).then(r => r.data.data || []);
  },
  staleTime: 60_000,
});

type EmployeePayload = {
  nom: string;
  prenoms: string;
  email?: string;
  date_naissance?: string;
  poste?: string;
  projet?: string;
  service_id?: number;
  date_embauche?: string;
  telephone?: string;
  numero_secu?: string;
  numero_urgence?: string;
  type_contrat?: string;
  status?: 'actif' | 'inactif';
};

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmployeePayload) => api.post('/employees', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-actifs'] });
      toast.success('Employé ajouté.');
    },
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmployeePayload }) => api.put(`/employees/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-actifs'] });
      toast.success('Employé mis à jour.');
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employees-actifs'] });
      toast.success('Employé supprimé.');
    },
  });
};

// Hook pour récupérer les services
export const useServices = () => useQuery({
  queryKey: ['services'],
  queryFn: () => api.get('/communes/services').then(r => r.data.data || r.data || []),
  staleTime: 300_000,
});