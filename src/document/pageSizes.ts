/**
 * Paper sizes the generated document can be laid out on. All maths is in
 * millimetres; conversions to CSS px (96 dpi) and PDF points (72 dpi) live here
 * so every platform exporter agrees on the page geometry.
 */
export type PageSizeId = 'letter' | 'legal' | 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'custom'
export type Orientation = 'portrait' | 'landscape'

export interface PageSpec {
  size: PageSizeId
  orientation: Orientation
  /** Only used when size === 'custom'. Portrait dimensions; orientation swaps them. */
  customWidthMm?: number
  customHeightMm?: number
}

export interface PageDimensionsMm {
  widthMm: number
  heightMm: number
}

export type NamedPageSizeId = Exclude<PageSizeId, 'custom'>

export const PAGE_SIZES: Record<NamedPageSizeId, PageDimensionsMm & { label: string }> = {
  letter: { label: 'Letter (8.5 x 11 in)', widthMm: 215.9, heightMm: 279.4 },
  legal: { label: 'Legal (8.5 x 14 in)', widthMm: 215.9, heightMm: 355.6 },
  a0: { label: 'A0 (841 x 1189 mm)', widthMm: 841, heightMm: 1189 },
  a1: { label: 'A1 (594 x 841 mm)', widthMm: 594, heightMm: 841 },
  a2: { label: 'A2 (420 x 594 mm)', widthMm: 420, heightMm: 594 },
  a3: { label: 'A3 (297 x 420 mm)', widthMm: 297, heightMm: 420 },
  a4: { label: 'A4 (210 x 297 mm)', widthMm: 210, heightMm: 297 },
  a5: { label: 'A5 (148 x 210 mm)', widthMm: 148, heightMm: 210 },
}

export const PAGE_SIZE_OPTIONS: { id: PageSizeId; label: string }[] = [
  ...(Object.keys(PAGE_SIZES) as NamedPageSizeId[]).map((id) => ({ id, label: PAGE_SIZES[id].label })),
  { id: 'custom', label: 'Custom size...' },
]

export const DEFAULT_PAGE: PageSpec = { size: 'letter', orientation: 'portrait' }

/** Sanity bounds for custom sizes (mm). */
export const CUSTOM_MIN_MM = 50
export const CUSTOM_MAX_MM = 2000

const clampMm = (v: number | undefined, fallback: number) => {
  if (v === undefined || !Number.isFinite(v)) return fallback
  return Math.min(CUSTOM_MAX_MM, Math.max(CUSTOM_MIN_MM, v))
}

/** Resolve a PageSpec to concrete width/height with orientation applied. */
export function pageDimensionsMm(spec: PageSpec): PageDimensionsMm {
  let widthMm: number
  let heightMm: number
  if (spec.size === 'custom') {
    widthMm = clampMm(spec.customWidthMm, PAGE_SIZES.letter.widthMm)
    heightMm = clampMm(spec.customHeightMm, PAGE_SIZES.letter.heightMm)
  } else {
    widthMm = PAGE_SIZES[spec.size].widthMm
    heightMm = PAGE_SIZES[spec.size].heightMm
  }
  // Portrait puts the shorter side across; landscape the longer side.
  const short = Math.min(widthMm, heightMm)
  const long = Math.max(widthMm, heightMm)
  return spec.orientation === 'landscape'
    ? { widthMm: long, heightMm: short }
    : { widthMm: short, heightMm: long }
}

export const MM_PER_INCH = 25.4
export const CSS_DPI = 96
export const PDF_DPI = 72

export const mmToPx = (mm: number, dpi = CSS_DPI) => (mm / MM_PER_INCH) * dpi
export const mmToPt = (mm: number) => (mm / MM_PER_INCH) * PDF_DPI

export function describePage(spec: PageSpec): string {
  const name = spec.size === 'custom' ? 'Custom' : PAGE_SIZES[spec.size].label.split(' (')[0]
  return `${name} - ${spec.orientation}`
}
