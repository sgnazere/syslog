import axios, { AxiosError } from 'axios';

// La session est un cookie HttpOnly envoyé automatiquement par le navigateur (même origine)
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

// Adresses qui répondent 401 sans que cela signifie « session expirée »
const NO_REDIRECT = ['/auth/login', '/auth/me'];

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    // Session expirée ou révoquée : retour à la page de connexion
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !NO_REDIRECT.some(p => url.includes(p))
        && window.location.pathname !== '/login') {
      window.location.href = '/login';
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
