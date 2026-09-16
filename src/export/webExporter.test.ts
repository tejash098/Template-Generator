import { describe, expect, it } from 'vitest'
import { PAGE_SIZES } from '../document/pageSizes'
import { MAX_RASTER_PIXELS, pixelRatioFor } from './webExporter'

describe('pixelRatioFor', () => {
  it('renders Letter at the full requested dpi', () => {
    expect(pixelRatioFor(PAGE_SIZES.letter, 300)).toBeCloseTo(300 / 96)
  })

  it('caps very large papers to the pixel budget', () => {
    const ratio = pixelRatioFor(PAGE_SIZES.a0, 300)
    const widthPx = (841 / 25.4) * 96 * ratio
    const heightPx = (1189 / 25.4) * 96 * ratio
    expect(ratio).toBeLessThan(300 / 96)
    expect(widthPx * heightPx).toBeCloseTo(MAX_RASTER_PIXELS, -3)
  })
})
