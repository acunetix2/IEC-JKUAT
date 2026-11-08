import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IEC JKUAT — Vite config
// SPA build; output is static files deployable to Vercel exactly like the
// old site/ folder. React Router handles client-side routing.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist', sourcemap: false },
});
