/**
 * The editor sends people to /signatures?return=<path> to create a signature
 * and expects to get them back. Only the editor's own routes are accepted, so
 * the parameter can never send anyone somewhere else (open redirect).
 */
const EDITOR_PATH = /^\/(new|bookings\/[A-Za-z0-9-]+)(\?[^#\s]*)?$/

export function safeReturnPath(value: string | null | undefined): string | null {
  return value && EDITOR_PATH.test(value) ? value : null
}

/** `path` with `signature=<id>` set (replacing any earlier one). */
export function withSignatureParam(path: string, signatureId: string): string {
  const [pathname, query = ''] = path.split('?')
  const params = new URLSearchParams(query)
  params.set('signature', signatureId)
  return `${pathname}?${params.toString()}`
}
