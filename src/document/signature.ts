import { isSignatureFontId, type SignatureFontId } from './signatureFonts'

/**
 * A signature as it is stored: in a member's signature library and, as a
 * snapshot, on every booking that uses it (so a receipt never changes when the
 * library does). Plain JSON; synced through Supabase.
 */
export type SignatureInk = 'blue' | 'black'

export const SIGNATURE_INKS: Record<SignatureInk, string> = {
  blue: '#1b2a8a',
  black: '#141414',
}

export const DEFAULT_SIGNATURE_INK: SignatureInk = 'blue'

export type SignatureMark =
  | { kind: 'typed'; text: string; font: SignatureFontId; ink: SignatureInk }
  /** Strokes are flat [x0, y0, x1, y1, …] integer lists inside width × height. */
  | { kind: 'drawn'; width: number; height: number; strokes: number[][]; ink: SignatureInk }
  /** A cleaned-up upload: transparent PNG, already trimmed and scaled down. */
  | { kind: 'image'; dataUrl: string; width: number; height: number }

/** Kept in step with the size check on the Supabase columns (bytes of JSON). */
export const MAX_SIGNATURE_BYTES = 200_000

export const MAX_TYPED_LENGTH = 60

const isInk = (v: unknown): v is SignatureInk => v === 'blue' || v === 'black'

const isDim = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 10_000

const isStroke = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length >= 2 && v.length % 2 === 0 && v.every((n) => typeof n === 'number' && Number.isFinite(n))

/**
 * Validates a mark that came from storage or the network. Anything malformed,
 * oversized or not a PNG data URL becomes null, which prints the staff name.
 */
export function asSignatureMark(value: unknown): SignatureMark | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  let mark: SignatureMark | null = null
  if (v.kind === 'typed') {
    if (typeof v.text === 'string' && v.text.trim() && v.text.length <= MAX_TYPED_LENGTH && isSignatureFontId(v.font) && isInk(v.ink)) {
      mark = { kind: 'typed', text: v.text, font: v.font, ink: v.ink }
    }
  } else if (v.kind === 'drawn') {
    if (isDim(v.width) && isDim(v.height) && Array.isArray(v.strokes) && v.strokes.length > 0 && v.strokes.every(isStroke) && isInk(v.ink)) {
      mark = { kind: 'drawn', width: v.width, height: v.height, strokes: v.strokes as number[][], ink: v.ink }
    }
  } else if (v.kind === 'image') {
    if (typeof v.dataUrl === 'string' && v.dataUrl.startsWith('data:image/png;base64,') && isDim(v.width) && isDim(v.height)) {
      mark = { kind: 'image', dataUrl: v.dataUrl, width: v.width, height: v.height }
    }
  }
  return mark && JSON.stringify(mark).length <= MAX_SIGNATURE_BYTES ? mark : null
}
