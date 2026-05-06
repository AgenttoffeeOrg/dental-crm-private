/**
 * Vite config for building the customer-facing booking-widget bundle.
 *
 *   npm run build:widget
 *
 * Output: public/widget-bundle.js (UMD, react bundled in).
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  // Disable Vite's static-asset publicDir scan; our outDir IS public/, which
  // would otherwise re-emit the existing files on every build.
  publicDir: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/booking-widget/embed-entry.ts'),
      name: 'DentalCRMWidget',
      formats: ['umd'],
      fileName: () => 'widget-bundle.js',
    },
    outDir: 'public',
    emptyOutDir: false,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      // Bundle React + ReactDOM so the embed has zero peer requirements.
      external: [],
    },
  },
})
