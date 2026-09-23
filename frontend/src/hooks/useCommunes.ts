import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Commune } from '../types';

export const useCommunes = () => useQuery({
  queryKey: ['communes'],
  queryFn: () => api.get<{ data: Commune[] }>('/communes').then(r => r.data.data),
  staleTime: Infinity,
});
