import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const reqlogPort = parseInt(process.env.REQLOG_PORT ?? '9000', 10);

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../../packages/core/dist/dashboard',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': `http://localhost:${reqlogPort}`,
      '/events': {
        target: `http://localhost:${reqlogPort}`,
        changeOrigin: true,
      },
    },
  },
});
