/**
 * Online transliteration provider: Google Input Tools (the same service behind
 * Google's Hindi typing keyboard). It is unofficial but stable, CORS-enabled
 * and dictionary-backed, so it handles English loanwords ("service", "bus")
 * and spelling conventions far better than rules can. Used only as an input
 * aid; nothing about the letter itself depends on it being reachable.
 */
const ENDPOINT = 'https://inputtools.google.com/request'
/** Hindi, transliteration input method. */
const INPUT_METHOD = 'hi-t-i0-und'

export async function fetchHindiSuggestions(
  word: string,
  { limit = 5, signal }: { limit?: number; signal?: AbortSignal } = {},
): Promise<string[]> {
  const params = new URLSearchParams({
    text: word,
    itc: INPUT_METHOD,
    num: String(limit),
    cp: '0',
    cs: '1',
    ie: 'utf-8',
    oe: 'utf-8',
  })
  const res = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!res.ok) throw new Error(`Input Tools HTTP ${res.status}`)
  // Shape: ["SUCCESS", [[word, [candidates...], [], {...}]]]
  const json = (await res.json()) as unknown
  if (!Array.isArray(json) || json[0] !== 'SUCCESS') throw new Error('Input Tools returned an error')
  const candidates = (json[1] as unknown[][])?.[0]?.[1]
  return Array.isArray(candidates) ? (candidates as string[]) : []
}
