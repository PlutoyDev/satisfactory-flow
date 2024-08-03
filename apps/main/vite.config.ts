import { stat } from 'fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

stat('public/extracted/parsedDocs.json').catch(() => {
  console.error('public/extracted/parsedDocs.json not found. Please run `pnpm parseDocs` first.');
  process.exit(1);
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});
