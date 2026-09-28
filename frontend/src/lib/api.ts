import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sl_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // Session expirée ou révoquée : retour à la connexion
    // (sauf pour la tentative de connexion elle-même, dont l'erreur est affichée dans le formulaire)
    const isLogin = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLogin) {
      localStorage.removeItem('sl_token');
      localStorage.removeItem('sl_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

/** Télécharge un fichier protégé par authentification. */
export const downloadFile = async (url: string, fileName: string) => {
  const res = await api.get(url, { responseType: 'blob', timeout: 60000 });
  const href = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(href);
};

export default api;
