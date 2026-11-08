import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IEC JKUAT — Vite config
// SPA build to web/dist, served by Vercel (see ../vercel.json: it builds
// this folder and rewrites every path to index.html for React Router).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
});
