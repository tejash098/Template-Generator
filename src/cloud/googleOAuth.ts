/*
 * The browser half of connecting Google Calendar (authorization code + PKCE).
 *
 * Connect: make a random verifier + state, keep them in sessionStorage, ask the
 * google-calendar Edge Function for Google's consent URL (it holds the client
 * id/secret) and go there. Google comes back to the site root with
 * `?code=…&state=…` (see oauthRedirect.ts); the callback page checks `state`
 * against what we kept and sends code + verifier to the function. The
 * verifier never leaves this browser until then, so a code injected from
 * elsewhere is useless (PKCE), and a foreign `state` is refused.
 */

const KEY = 'srbs.oauth'

export interface PendingOAuth {
  state: string
  verifier: string
  redirectUri: string
  /** In-app route to return to afterwards. */
  returnTo: string
}

export function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** `bytes` random bytes, base64url (32 bytes → a 43-character PKCE verifier). */
export function randomToken(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** RFC 7636 S256: base64url(SHA-256(verifier)). */
export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

/** Where Google sends the browser back: this page's origin + path (the site root), never the hash. */
export function redirectUri(location: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${location.origin}${location.pathname}`
}

/** Only in-app paths, so a stored value can never send the user elsewhere. */
export function safeReturnTo(path: string | null | undefined, fallback = '/plugins'): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : fallback
}

export function savePending(pending: PendingOAuth): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(pending))
  } catch {
    // Storage blocked: the callback will report an invalid state.
  }
}

/** Reads and forgets the pending connect (one use). */
export function takePending(): PendingOAuth | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<PendingOAuth>
    if (!value.state || !value.verifier || !value.redirectUri) return null
    return { state: value.state, verifier: value.verifier, redirectUri: value.redirectUri, returnTo: safeReturnTo(value.returnTo) }
  } catch {
    return null
  }
}
