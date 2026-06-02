import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'example'),
  resolve: {
    alias: {
      'react-component-library': resolve(__dirname, 'src/index.ts'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
