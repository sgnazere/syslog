import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Cible de l'API (autre instance possible, ex. démonstration : VITE_API_TARGET=http://localhost:5058)
const proxy = {
  '/api': {
    target: process.env.VITE_API_TARGET || 'http://localhost:5000',
    changeOrigin: true,
  },
};

// En-têtes de sécurité de la page (la production utilise deploy/nginx/syslog.conf)
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

// Politique de contenu stricte du build de production : aucun script en ligne, aucune
// ressource externe. 'unsafe-inline' pour les styles (attributs style et Recharts).
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // Développement : pas de CSP stricte (Vite injecte des scripts en ligne pour le rechargement à chaud)
  server: {
    port: 5173,
    // Toujours le port 5173 : si déjà occupé, Vite s'arrête au lieu d'en prendre un autre
    strictPort: true,
    // Adresses de partage par tunnel VS Code (onglet Ports)
    allowedHosts: ['.devtunnels.ms'],
    headers: SECURITY_HEADERS,
    proxy,
  },
  // « npm run preview » : sert le build de production avec la CSP stricte, pour la tester en local
  preview: {
    port: 4173,
    headers: { ...SECURITY_HEADERS, 'Content-Security-Policy': CONTENT_SECURITY_POLICY },
    proxy,
  },
});
