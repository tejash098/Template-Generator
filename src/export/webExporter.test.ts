import { describe, expect, it } from 'vitest'
import { PAGE_SIZES } from '../document/pageSizes'
import { MAX_RASTER_PIXELS, pixelRatioFor, webExporter } from './webExporter'

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

describe('pagesToPdf', () => {
  // 1×1 transparent PNG.
  const PNG = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
    (c) => c.charCodeAt(0),
  )

  it('adds one page per job at the exact paper size', async () => {
    const exporter = {
      ...webExporter,
      toImage: async () => new Blob([PNG], { type: 'image/png' }),
    }
    const job = {
      node: document.createElement('div'),
      page: PAGE_SIZES.a4,
      fileStem: 'report',
    }
    const blob = await exporter.pagesToPdf([job, job, job], 'Report')
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()))
    expect(pdf.getPageCount()).toBe(3)
    expect(pdf.getTitle()).toBe('Report')
    expect(pdf.getPage(0).getWidth()).toBeCloseTo((210 / 25.4) * 72)
  })
})
