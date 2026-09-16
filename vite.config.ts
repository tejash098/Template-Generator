import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The SPA is also shipped inside Capacitor/Electron shells, which load it
  // from the filesystem — relative asset URLs keep the same build working there.
  base: './',
  // These load lazily at export time; pre-bundling them stops Vite's dev
  // optimizer from discovering them mid-export and reloading the page.
  optimizeDeps: {
    include: ['html-to-image', 'pdf-lib'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
