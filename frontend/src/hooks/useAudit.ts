import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export interface AuditLog {
  id:         number;
  user_id:    number;
  user_name:  string;
  user_email: string;
  user_role:  string;
  action:     string;
  entity:     string;
  entity_id:  string;
  details:    string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditMeta {
  entities: string[];
  actions:  string[];
  users:    { user_id: number; user_name: string; user_email: string }[];
}

interface AuditFilters {
  userId?:  string;
  entity?:  string;
  action?:  string;
  from?:    string;
  to?:      string;
  page?:    number;
  limit?:   number;
}

export const useAuditLogs = (filters: AuditFilters) => {
  const qp = new URLSearchParams(
    Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== undefined && v !== '')
    ) as Record<string, string>
  ).toString();

  return useQuery({
    queryKey: ['audit', filters],
    queryFn: () =>
      api.get<{ data: AuditLog[]; total: number; page: number; pages: number }>(
        `/audit?${qp}`
      ).then(r => r.data),
    staleTime: 15_000,
  });
};

export const useAuditMeta = () =>
  useQuery({
    queryKey: ['audit-meta'],
    queryFn:  () => api.get<{ entities: string[]; actions: string[]; users: any[] }>('/audit/meta').then(r => r.data),
    staleTime: 60_000,
  });
