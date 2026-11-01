/**
 * Styles offered for a typed signature: eight that write Latin and eight that
 * write Devanagari, each mostly handwriting with a couple of typed faces. All
 * are bundled with @fontsource (main.tsx) so they work offline and embed in
 * exports. Ids are stored in signatures, so never rename one.
 */
export type SignatureScript = 'latin' | 'devanagari'

export interface SignatureFont {
  id: string
  family: string
  weight: number
  italic?: true
  script: SignatureScript
  /** A typed (print) face rather than handwriting. */
  typed?: true
  /** Relative size so every style reads at about the same height. */
  scale: number
}

export const SIGNATURE_FONTS = [
  { id: 'dancing-script', family: 'Dancing Script', weight: 600, script: 'latin', scale: 1 },
  { id: 'great-vibes', family: 'Great Vibes', weight: 400, script: 'latin', scale: 1.15 },
  { id: 'sacramento', family: 'Sacramento', weight: 400, script: 'latin', scale: 1.2 },
  { id: 'allura', family: 'Allura', weight: 400, script: 'latin', scale: 1.15 },
  { id: 'homemade-apple', family: 'Homemade Apple', weight: 400, script: 'latin', scale: 0.75 },
  { id: 'caveat', family: 'Caveat', weight: 600, script: 'latin', scale: 1.05 },
  { id: 'playfair-italic', family: 'Playfair Display', weight: 400, italic: true, script: 'latin', typed: true, scale: 0.85 },
  { id: 'courier-prime', family: 'Courier Prime', weight: 400, script: 'latin', typed: true, scale: 0.75 },
  { id: 'kalam', family: 'Kalam', weight: 400, script: 'devanagari', scale: 0.9 },
  { id: 'amita', family: 'Amita', weight: 400, script: 'devanagari', scale: 0.85 },
  { id: 'tillana', family: 'Tillana', weight: 500, script: 'devanagari', scale: 0.9 },
  { id: 'yatra-one', family: 'Yatra One', weight: 400, script: 'devanagari', scale: 0.9 },
  { id: 'tiro-devanagari', family: 'Tiro Devanagari Hindi', weight: 400, script: 'devanagari', typed: true, scale: 0.85 },
  { id: 'mukta', family: 'Mukta', weight: 500, script: 'devanagari', typed: true, scale: 0.85 },
  { id: 'rozha-one', family: 'Rozha One', weight: 400, script: 'devanagari', typed: true, scale: 0.85 },
  { id: 'martel', family: 'Martel', weight: 600, script: 'devanagari', typed: true, scale: 0.75 },
] as const satisfies readonly SignatureFont[]

export type SignatureFontId = (typeof SIGNATURE_FONTS)[number]['id']

const BY_ID = new Map<string, SignatureFont>(SIGNATURE_FONTS.map((f) => [f.id, f]))

export const signatureFont = (id: SignatureFontId): SignatureFont => BY_ID.get(id) as SignatureFont

export const isSignatureFontId = (value: unknown): value is SignatureFontId => typeof value === 'string' && BY_ID.has(value)

const DEVANAGARI = /[ऀ-ॿ]/

/** Devanagari text gets the Devanagari styles, anything else the Latin ones. */
export const scriptOf = (text: string): SignatureScript => (DEVANAGARI.test(text) ? 'devanagari' : 'latin')

export const fontsForText = (text: string): SignatureFont[] =>
  SIGNATURE_FONTS.filter((f) => f.script === scriptOf(text))

/** CSS font-family list with a sensible fallback for the script. */
export const fontFamilyCss = (font: SignatureFont): string =>
  `'${font.family}', ${font.script === 'devanagari' ? "'Tiro Devanagari Hindi', serif" : 'cursive'}`
