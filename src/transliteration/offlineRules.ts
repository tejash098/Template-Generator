/**
 * Offline, rule-based Roman → Devanagari transliteration.
 *
 * This is the fallback when Google Input Tools is unreachable. It follows the
 * loose "Hinglish" conventions people actually type (seva, namaste, bhabhua)
 * rather than a strict scheme like ITRANS, and applies a few Hindi spelling
 * heuristics (inherent-a deletion at word end, anusvara before stops, nasal
 * word endings). It cannot know dictionary spellings, so results are a good
 * first draft that the user may need to touch up — which is why it is only
 * the fallback.
 */

import { isTransliterable } from './currentWord'

const VIRAMA = '्' // ्  (halant)
const ANUSVARA = 'ं' // ं

/** [independent form, matra]. `a` has no matra: it is the inherent vowel. */
const VOWELS: Record<string, [string, string]> = {
  a: ['अ', ''],
  aa: ['आ', 'ा'],
  A: ['आ', 'ा'],
  i: ['इ', 'ि'],
  ii: ['ई', 'ी'],
  ee: ['ई', 'ी'],
  I: ['ई', 'ी'],
  u: ['उ', 'ु'],
  uu: ['ऊ', 'ू'],
  oo: ['ऊ', 'ू'],
  U: ['ऊ', 'ू'],
  e: ['ए', 'े'],
  ei: ['ए', 'े'],
  ai: ['ऐ', 'ै'],
  o: ['ओ', 'ो'],
  au: ['औ', 'ौ'],
  ou: ['औ', 'ौ'],
  Ri: ['ऋ', 'ृ'],
}

/** Consonants carry an inherent "a" unless followed by a vowel or virama. */
const CONSONANTS: Record<string, string> = {
  k: 'क',
  kh: 'ख',
  g: 'ग',
  gh: 'घ',
  ch: 'च',
  chh: 'छ',
  Ch: 'छ',
  j: 'ज',
  jh: 'झ',
  z: 'ज़',
  T: 'ट',
  Th: 'ठ',
  D: 'ड',
  Dh: 'ढ',
  N: 'ण',
  R: 'ड़',
  Rh: 'ढ़',
  t: 'त',
  th: 'थ',
  d: 'द',
  dh: 'ध',
  n: 'न',
  p: 'प',
  ph: 'फ',
  f: 'फ़',
  b: 'ब',
  bh: 'भ',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  v: 'व',
  w: 'व',
  sh: 'श',
  Sh: 'ष',
  s: 'स',
  h: 'ह',
  x: 'क्ष',
  ksh: 'क्ष',
  gy: 'ज्ञ',
  dny: 'ज्ञ',
  q: 'क़',
  c: 'क',
}

/** Consonants before which a preceding "n" becomes anusvara (संगम, हिंदी, बंद). */
const ANUSVARA_BEFORE = new Set(['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ', 'ड', 'ढ', 'त', 'थ', 'द', 'ध', 'प', 'फ', 'ब', 'भ', 'स', 'श', 'ष', 'ह'])

/** Vowel keys after which a word-final "n" is written as anusvara. */
const NASAL_ENDING_AFTER = new Set(['e', 'ei', 'ai'])

const MAX_KEY = 3
const isLatin = (ch: string | undefined) => !!ch && /[A-Za-z]/.test(ch)

function lookup<T>(table: Record<string, T>, text: string, i: number): [string, T] | null {
  for (let len = MAX_KEY; len >= 1; len--) {
    const key = text.slice(i, i + len)
    if (key.length < len) continue
    // Exact (case-sensitive) first so T/D/N/Sh keep their retroflex meaning,
    // then the lowercase reading.
    if (key in table) return [key, table[key]]
    const lower = key.toLowerCase()
    if (lower !== key && lower in table) return [key, table[lower]]
  }
  return null
}

/** Transliterate one Roman word (letters only). */
export function transliterateWord(raw: string): string {
  if (!raw) return raw
  // A sentence-case word ("Namaste") is not a retroflex hint, so lowercase it;
  // capitals elsewhere ("kaTa") keep their T/D/N/Sh meaning.
  const word = /^[A-Z][a-z]*$/.test(raw) ? raw.toLowerCase() : raw

  const out: string[] = []
  let open = false // last emitted consonant still carries its inherent "a"
  let lastVowel = '' // key of the vowel emitted last, '' if a consonant was
  let i = 0

  while (i < word.length) {
    const cons = lookup(CONSONANTS, word, i)
    const vow = lookup(VOWELS, word, i)
    const ch = word[i]

    if (ch === 'M') {
      out.push(ANUSVARA)
      open = false
      lastVowel = ''
      i += 1
      continue
    }

    // Prefer the vowel reading when both match and the vowel key is longer
    // (e.g. "ai" over "a"), otherwise consonants win.
    if (cons && !(vow && vow[0].length > cons[0].length)) {
      const [key, glyph] = cons
      const atEnd = !isLatin(word[i + key.length])

      // Word-final "n" after e/ai is a nasal ending: में, हैं, मैं.
      if (key === 'n' && atEnd && NASAL_ENDING_AFTER.has(lastVowel)) {
        out.push(ANUSVARA)
        open = false
        lastVowel = ''
        i += key.length
        continue
      }

      if (open) {
        const prev = out[out.length - 1]
        if (prev === 'न' && ANUSVARA_BEFORE.has(glyph[0])) {
          out[out.length - 1] = ANUSVARA
        } else {
          out.push(VIRAMA)
        }
      }
      out.push(glyph)
      open = true
      lastVowel = ''
      i += key.length
      continue
    }

    if (vow) {
      const [key, [independent, matra]] = vow
      const atEnd = !isLatin(word[i + key.length])
      if (key === 'a') {
        // "raja" → राजा, "bhabhua" → भभुआ: a trailing "a" is long; mid-word
        // after a consonant it is the inherent vowel and emits nothing.
        if (atEnd) out.push(open ? 'ा' : 'आ')
        else if (!open) out.push(independent)
      } else if (open) {
        // Word-final short i is rare in Hindi ("meri" → मेरी, "ki" → की).
        out.push(key === 'i' && atEnd ? 'ी' : matra)
      } else {
        out.push(independent)
      }
      open = false
      // An inherent "a" is not an explicit vowel for the nasal-ending rule.
      lastVowel = key === 'a' && !atEnd ? '' : key
      i += key.length
      continue
    }

    // Anything else (should not happen for letter-only input) passes through.
    out.push(ch)
    open = false
    lastVowel = ''
    i += 1
  }

  return out.join('')
}

/**
 * Transliterate every Hindi-looking Latin word in a string, leaving numbers,
 * codes and acronyms intact. `|` becomes the danda (।).
 */
export function transliterateText(text: string): string {
  return text
    .replace(/[A-Za-z0-9]+/g, (token) => (isTransliterable(token) ? transliterateWord(token) : token))
    .replace(/\|/g, '।')
}
