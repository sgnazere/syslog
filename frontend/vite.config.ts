import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // Toujours le port 5173 : si déjà occupé, Vite s'arrête au lieu d'en prendre un autre
    strictPort: true,
    proxy: {
      '/api': {
        // Cible de l'API (autre instance possible, ex. démonstration : VITE_API_TARGET=http://localhost:5058)
        target: process.env.VITE_API_TARGET || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
