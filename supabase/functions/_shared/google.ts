// Google OAuth 2.0 (authorization code + PKCE) for the Calendar connection.
// Same OAuth client as DocuDrive; its ID and secret exist only as Edge
// Function secrets. Never log codes, tokens or email addresses from here.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke'
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']

/** Create its own calendars and manage events in them, and nothing else. */
export const SCOPE_CALENDAR = 'https://www.googleapis.com/auth/calendar.app.created'
/** openid + email: the ID token then says which Google account was connected. */
const CONNECT_SCOPES = ['openid', 'email', SCOPE_CALENDAR]

/** An error the client can show; `code` is an i18n key suffix (`calendar.error.<code>`). */
export class AppError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}

/** The refresh token was revoked or expired: the member has to connect again. */
export class GoogleReauthRequired extends Error {
  constructor() {
    super('google reauth required')
  }
}

export interface GoogleConfig {
  clientId: string
  clientSecret: string
  /** Allowed redirect URIs (exactly as registered on the OAuth client). */
  redirectUris: string[]
}

export function googleConfig(): GoogleConfig {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
  const redirectUris = (Deno.env.get('GOOGLE_REDIRECT_URIS') ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  if (!clientId || !clientSecret || !redirectUris.length) throw new AppError('google_disabled', 503)
  return { clientId, clientSecret, redirectUris }
}

export function buildAuthUrl(
  cfg: GoogleConfig,
  p: { state: string; codeChallenge: string; redirectUri: string; loginHint?: string },
): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: p.redirectUri,
    response_type: 'code',
    scope: CONNECT_SCOPES.join(' '),
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline', // a refresh token, so edits can reach Google later
    include_granted_scopes: 'true',
    prompt: 'consent', // Google then always sends a refresh token, even on a reconnect
  })
  if (p.loginHint) params.set('login_hint', p.loginHint)
  return `${AUTH_URL}?${params}`
}

export interface GoogleTokens {
  accessToken: string
  refreshToken: string | null
  scopes: Set<string>
  idToken: string | null
}

async function postToken(cfg: GoogleConfig, form: Record<string, string>): Promise<Response> {
  return await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...form }),
  })
}

async function errorOf(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return String(data?.error ?? '')
  } catch {
    return ''
  }
}

export async function exchangeCode(
  cfg: GoogleConfig,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<GoogleTokens> {
  let res: Response
  try {
    res = await postToken(cfg, { code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirectUri })
  } catch (err) {
    console.warn('google token exchange failed', String(err))
    throw new AppError('google_exchange_failed', 502)
  }
  if (!res.ok) {
    const reason = await errorOf(res)
    console.warn('google token exchange failed', res.status, reason)
    if (reason === 'invalid_grant') throw new AppError('oauth_state_invalid', 400) // code used or expired
    throw new AppError('google_exchange_failed', 502)
  }
  const data = await res.json()
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    scopes: new Set(String(data.scope ?? '').split(' ').filter(Boolean)),
    idToken: data.id_token ? String(data.id_token) : null,
  }
}

/** A fresh access token. Throws GoogleReauthRequired when Google refuses the refresh token. */
export async function refreshAccessToken(cfg: GoogleConfig, refreshToken: string): Promise<string> {
  const res = await postToken(cfg, { refresh_token: refreshToken, grant_type: 'refresh_token' })
  if (!res.ok) {
    const reason = await errorOf(res)
    if ((res.status === 400 || res.status === 401) && (reason === 'invalid_grant' || reason === 'unauthorized_client')) {
      throw new GoogleReauthRequired()
    }
    throw new Error(`google token refresh failed: HTTP ${res.status} ${reason}`)
  }
  const data = await res.json()
  return String(data.access_token)
}

/** Best effort: a token that is already invalid is fine. */
export async function revokeToken(token: string): Promise<void> {
  try {
    const res = await fetch(REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token }),
    })
    if (!res.ok && res.status !== 400) console.warn('google revoke returned', res.status)
  } catch (err) {
    console.warn('google revoke failed', String(err))
  }
}

/**
 * Who was connected. The ID token comes straight from Google's token endpoint
 * over TLS (OpenID Connect Core §3.1.3.7 lets TLS stand in for the signature
 * check here); audience and issuer are still checked.
 */
export function idTokenClaims(idToken: string, clientId: string): { sub: string; email: string } {
  try {
    const payload = idToken.split('.')[1] ?? ''
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '='))
    const claims = JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (c) => c.charCodeAt(0))))
    const audOk = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId
    if (!audOk || !ISSUERS.includes(claims.iss) || !claims.sub) throw new Error('bad claims')
    return { sub: String(claims.sub), email: String(claims.email ?? '') }
  } catch {
    throw new AppError('google_exchange_failed', 502)
  }
}
