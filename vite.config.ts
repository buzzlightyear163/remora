import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { hyperliquidApi } from './server/hyperliquidApi';

export default defineConfig({
  plugins: [react(), hyperliquidApi()],
  server: { port: 5173, open: true },
  preview: { port: 4173 },
  build: { chunkSizeWarningLimit: 900 },
});
