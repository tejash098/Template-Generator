import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type AppSupabaseClient = SupabaseClient<Database>

// Both are injected by `define` in vite.config.ts, which resolves them from
// VITE_* / SUPABASE_* / NEXT_PUBLIC_* names at build time ('' when unset).
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/**
 * The one Supabase client, or `null` when the build has no cloud config —
 * every cloud feature checks this and hides itself, so the offline-only app
 * keeps working unchanged.
 *
 * `detectSessionInUrl` is off: auth email links carry a token hash in the
 * query string and the app exchanges it itself (see decisions.md), because
 * HashRouter owns the URL fragment.
 */
export const supabase: AppSupabaseClient | null =
  url && key
    ? createClient<Database>(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null

export const cloudEnabled = supabase !== null
