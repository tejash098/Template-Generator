import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Supabase client config, resolved at build time from whatever the host set.
 * Vercel's Supabase integration provides `SUPABASE_*` / `NEXT_PUBLIC_*`
 * names, local `.env` files use `VITE_*`; the first non-empty value wins.
 *
 * Only these two values are injected (see `define` below). The rest of the
 * environment — service-role key, JWT secret, `POSTGRES_*` credentials —
 * must never reach the bundle, which is why `envPrefix` is left at `VITE_`
 * instead of being widened to `SUPABASE_`.
 */
const SUPABASE_URL_KEYS = ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY_KEYS = [
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  // Legacy anon key: also client-safe, same RLS boundary.
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]

const firstSet = (env: Record<string, string | undefined>, names: string[]): string =>
  names.map((n) => env[n]?.trim()).find(Boolean) ?? ''

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' = every variable (.env files plus process.env), not just VITE_*.
  // This object stays in Node; only the two picks below reach the bundle.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    // The SPA is also shipped inside Capacitor/Electron shells, which load it
    // from the filesystem — relative asset URLs keep the same build working there.
    base: './',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(firstSet(env, SUPABASE_URL_KEYS)),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(firstSet(env, SUPABASE_KEY_KEYS)),
    },
    // These load lazily at export time; pre-bundling them stops Vite's dev
    // optimizer from discovering them mid-export and reloading the page.
    optimizeDeps: {
      include: ['html-to-image', 'pdf-lib'],
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
