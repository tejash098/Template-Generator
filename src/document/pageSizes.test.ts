import { describe, expect, it } from 'vitest'
import { describePage, mmToPt, mmToPx, pageDimensionsMm } from './pageSizes'

describe('pageDimensionsMm', () => {
  it('returns Letter portrait by default', () => {
    expect(pageDimensionsMm({ size: 'letter', orientation: 'portrait' })).toEqual({ widthMm: 215.9, heightMm: 279.4 })
  })

  it('swaps sides for landscape', () => {
    expect(pageDimensionsMm({ size: 'a4', orientation: 'landscape' })).toEqual({ widthMm: 297, heightMm: 210 })
  })

  it('uses custom dimensions and normalises orientation', () => {
    const spec = { size: 'custom', orientation: 'portrait', customWidthMm: 300, customHeightMm: 100 } as const
    expect(pageDimensionsMm(spec)).toEqual({ widthMm: 100, heightMm: 300 })
    expect(pageDimensionsMm({ ...spec, orientation: 'landscape' })).toEqual({ widthMm: 300, heightMm: 100 })
  })

  it('clamps absurd custom sizes and falls back when missing', () => {
    expect(pageDimensionsMm({ size: 'custom', orientation: 'portrait', customWidthMm: 1, customHeightMm: 99999 })).toEqual({
      widthMm: 50,
      heightMm: 2000,
    })
    expect(pageDimensionsMm({ size: 'custom', orientation: 'portrait' })).toEqual({ widthMm: 215.9, heightMm: 279.4 })
  })
})

describe('unit conversions', () => {
  it('converts mm to CSS px at 96 dpi and to PDF points at 72 dpi', () => {
    expect(mmToPx(25.4)).toBeCloseTo(96)
    expect(mmToPt(25.4)).toBeCloseTo(72)
  })
})

describe('describePage', () => {
  it('names the size and orientation', () => {
    expect(describePage({ size: 'legal', orientation: 'landscape' })).toBe('Legal - landscape')
    expect(describePage({ size: 'custom', orientation: 'portrait' })).toBe('Custom - portrait')
  })
})
