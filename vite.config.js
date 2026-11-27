import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funziona sia in locale sia su GitHub Pages (/IronSworn/).
export default defineConfig({ plugins: [react()], base: './' });
