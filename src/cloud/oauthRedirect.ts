/** The in-app route that finishes a Google Calendar connect. */
export const OAUTH_CALLBACK_ROUTE = '/oauth/google'

/**
 * Google redirects to `/?code=…&state=…` (or `?error=…&state=…`): a redirect
 * URI cannot carry a `#fragment`, and HashRouter keeps every route there. Run
 * before the router mounts, this moves that query into
 * `#/oauth/google?code=…&state=…` and so also wipes it from the real query
 * string. Email links (`?token_hash=…#/auth/set-password`) are left alone.
 * Returns true when it rewrote the URL.
 */
export function routeOAuthRedirect(location: Location = window.location, history: History = window.history): boolean {
  const params = new URLSearchParams(location.search)
  if (!params.has('state') || !(params.has('code') || params.has('error')) || params.has('token_hash')) return false
  history.replaceState(null, '', `${location.pathname}#${OAUTH_CALLBACK_ROUTE}?${params}`)
  return true
}
