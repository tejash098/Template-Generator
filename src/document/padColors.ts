/**
 * The operator's printed pads come in several ink colours. The whole
 * letterhead (text, buses, swastika, address band, dotted rules, footer) is
 * drawn in `currentColor` / `--brand`, so one hex recolours everything.
 * `blank` is the physical pre-printed pad: the artwork keeps its space but is
 * not painted, and what we do print (values, prose, signatures) is in ink.
 * Display names live in i18n (`padColor.*`) to keep document/ language-neutral.
 */
export type PadColorId = 'navy' | 'orange' | 'green' | 'maroon' | 'black' | 'blank'

export interface PadColor {
  hex: string
  /** Print on the operator's pre-printed pad: letterhead laid out but invisible. */
  preprinted?: true
}

export const PAD_COLORS: Record<PadColorId, PadColor> = {
  navy: { hex: '#1f2a6e' },
  orange: { hex: '#f05a28' },
  green: { hex: '#1e7a3c' },
  maroon: { hex: '#8b1e2d' },
  black: { hex: '#1d1d1f' },
  blank: { hex: '#1d1d1f', preprinted: true },
}

export const PAD_COLOR_IDS = Object.keys(PAD_COLORS) as PadColorId[]

/** The booking samples were all written on the navy pad. */
export const DEFAULT_PAD_COLOR: PadColorId = 'navy'

export const isPadColorId = (value: unknown): value is PadColorId =>
  typeof value === 'string' && value in PAD_COLORS
