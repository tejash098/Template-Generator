// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { base64Url, codeChallenge, randomToken, redirectUri, safeReturnTo, savePending, takePending } from './googleOAuth'

describe('PKCE', () => {
  it('matches the RFC 7636 appendix B S256 example', async () => {
    expect(await codeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('makes 43-character base64url verifiers that differ every time', () => {
    const a = randomToken(32)
    const b = randomToken(32)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
    expect(base64Url(new Uint8Array([251, 255]))).toBe('-_8')
  })
})

describe('redirect and return paths', () => {
  it('redirects to the page itself, never the hash', () => {
    expect(redirectUri({ origin: 'https://template-generator-ruby.vercel.app', pathname: '/' })).toBe(
      'https://template-generator-ruby.vercel.app/',
    )
  })

  it('only returns to in-app paths', () => {
    expect(safeReturnTo('/plugins')).toBe('/plugins')
    expect(safeReturnTo('//evil.test')).toBe('/plugins')
    expect(safeReturnTo('https://evil.test')).toBe('/plugins')
    expect(safeReturnTo(undefined, '/bookings')).toBe('/bookings')
  })
})

describe('pending connect', () => {
  const store = new Map<string, string>()
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
  })
  afterEach(() => {
    store.clear()
    vi.unstubAllGlobals()
  })

  it('is read once', () => {
    savePending({ state: 's', verifier: 'v', redirectUri: 'http://localhost:5173/', returnTo: '/plugins' })
    expect(takePending()).toEqual({ state: 's', verifier: 'v', redirectUri: 'http://localhost:5173/', returnTo: '/plugins' })
    expect(takePending()).toBeNull()
  })

  it('ignores a malformed or tampered record', () => {
    store.set('srbs.oauth', '{"state":"s"}')
    expect(takePending()).toBeNull()
    store.set('srbs.oauth', JSON.stringify({ state: 's', verifier: 'v', redirectUri: 'x', returnTo: '//evil.test' }))
    expect(takePending()?.returnTo).toBe('/plugins')
  })
})
