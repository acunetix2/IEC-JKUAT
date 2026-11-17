import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/admin/',
  publicDir: '../web/public',
  plugins: [
    react(),
    {
      name: 'admin-favicon-asset',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'uploads/iec-mark.png',
          source: readFileSync(new URL('../web/public/uploads/iec-mark.png', import.meta.url)),
        });
      },
    },
  ],
  server: { port: 5174 },
  build: {
    outDir: '../web/dist/admin',
    emptyOutDir: true,
    sourcemap: false,
    copyPublicDir: false,
  },
});
