import { createContext } from 'react'
import type { CloudApi, Membership } from './cloudApi'

/**
 * disabled    – no Supabase config in this build
 * loading     – restoring the session / resolving membership
 * anonymous   – signed out (local-only mode)
 * member      – signed in with an active membership; sync is running
 * not-member  – signed in but no active membership (revoked/uninvited); signed out again
 */
export type AuthStatus = 'disabled' | 'loading' | 'anonymous' | 'member' | 'not-member'

export interface AuthUser {
  id: string
  email: string
}

export type TokenHashType = 'invite' | 'recovery' | 'email' | 'magiclink'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  membership: Membership | null
  deviceCode: string | null
  isOwner: boolean
  /** Null when the build has no cloud config. */
  api: CloudApi | null
  /** Each action resolves to an error message (already localisable key or text) or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: (options?: { discardUnsynced?: boolean }) => Promise<'ok' | 'unsynced'>
  requestPasswordReset: (email: string) => Promise<string | null>
  verifyTokenHash: (tokenHash: string, type: TokenHashType) => Promise<string | null>
  setPassword: (password: string) => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
