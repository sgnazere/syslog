/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#1a4f8a', light: '#2563eb', dark: '#0f2f5c' },
        accent:    { DEFAULT: '#f59e0b', light: '#fbbf24' },
        success:   '#10b981',
        warning:   '#f59e0b',
        danger:    '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
