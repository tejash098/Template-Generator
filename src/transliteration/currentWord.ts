export interface CurrentWord {
  start: number
  text: string
}

/**
 * Whether an alphanumeric token is meant as Hindi. Anything with digits
 * (BR24P8555) or in all caps (AM, RTA) is almost always meant literally.
 */
export function isTransliterable(token: string): boolean {
  if (!/^[A-Za-z]+$/.test(token)) return false
  return !(token.length > 1 && token === token.toUpperCase())
}

/** The Roman word immediately before the caret, if it should be transliterated. */
export function currentWord(text: string, caret: number): CurrentWord | null {
  const m = /[A-Za-z0-9]+$/.exec(text.slice(0, caret))
  if (!m || !isTransliterable(m[0])) return null
  return { start: caret - m[0].length, text: m[0] }
}
