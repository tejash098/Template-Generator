import { CSS_DPI, mmToPt, mmToPx, type PageDimensionsMm } from '../document/pageSizes'
import type { DocumentExporter, ExportJob, ImageFormat, ShareResult } from './exporter'

/*
 * Browser implementation. Devanagari shaping is only reliable when the
 * browser itself draws the text, so images are captured from the live DOM
 * (html-to-image) and the PDF wraps that image at the exact paper size.
 * A vector PDF on the plain website is available through Print → Save as PDF.
 */

export const DEFAULT_EXPORT_DPI = 300
/** Upper bound on canvas pixels so phones do not run out of memory on A0–A2. */
export const MAX_RASTER_PIXELS = 24_000_000

export function pixelRatioFor(page: PageDimensionsMm, dpi: number): number {
  const widthPx = mmToPx(page.widthMm)
  const heightPx = mmToPx(page.heightMm)
  let ratio = dpi / CSS_DPI
  const pixels = widthPx * heightPx * ratio * ratio
  if (pixels > MAX_RASTER_PIXELS) ratio *= Math.sqrt(MAX_RASTER_PIXELS / pixels)
  return ratio
}

function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const mime = /^data:([^;]+)/.exec(dataUrl)?.[1] ?? 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const isWebKit = () =>
  typeof navigator !== 'undefined' &&
  /AppleWebKit/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Edg\//.test(navigator.userAgent)

async function captureDataUrl(job: ExportJob, format: ImageFormat, dpi: number): Promise<string> {
  // Loaded on demand: the capture and PDF libraries are heavy and only needed
  // once someone exports.
  const { toJpeg, toPng } = await import('html-to-image')
  const options = {
    pixelRatio: pixelRatioFor(job.page, dpi),
    backgroundColor: '#ffffff',
    width: job.node.offsetWidth,
    height: job.node.offsetHeight,
    style: { margin: '0', boxShadow: 'none' },
  }
  const render = () =>
    format === 'png' ? toPng(job.node, options) : toJpeg(job.node, { ...options, quality: 0.92 })
  // WebKit drops embedded web fonts on the first capture; warm it up.
  if (isWebKit()) await render()
  return render()
}

export const webExporter: DocumentExporter = {
  pdfKind: 'raster',

  async toImage(job, format, dpi = DEFAULT_EXPORT_DPI) {
    return dataUrlToBlob(await captureDataUrl(job, format, dpi))
  },

  toPdf(job) {
    return this.pagesToPdf([job], job.title ?? job.fileStem)
  },

  async pagesToPdf(jobs, title) {
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.create()
    pdf.setTitle(title ?? jobs[0]?.title ?? jobs[0]?.fileStem ?? '')
    pdf.setProducer('Shri Ram Bus Service Bookings')
    pdf.setCreationDate(new Date())
    // One page at a time so a phone never holds every raster at once.
    for (const job of jobs) {
      const png = await this.toImage(job, 'png', DEFAULT_EXPORT_DPI)
      const page = pdf.addPage([mmToPt(job.page.widthMm), mmToPt(job.page.heightMm)])
      const image = await pdf.embedPng(await png.arrayBuffer())
      page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() })
    }
    return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
  },

  async print(page) {
    // Print CSS (styles/app.css) hides the app chrome and shows the sheet at
    // 1:1; the paper size must be injected per document.
    const style = document.createElement('style')
    style.textContent = `@page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: 0; }`
    document.head.appendChild(style)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

    let done = false
    const cleanup = () => {
      if (done) return
      done = true
      style.remove()
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
    // Fallback for engines that never fire afterprint.
    window.setTimeout(cleanup, 5000)
  },

  canShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function'
  },

  async share(blob, fileName, title): Promise<ShareResult> {
    const file = new File([blob], fileName, { type: blob.type })
    if (!this.canShare() || !navigator.canShare({ files: [file] })) return 'unsupported'
    try {
      await navigator.share({ files: [file], title })
      return 'shared'
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'cancelled'
      throw err
    }
  },

  download(blob, fileName) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}
