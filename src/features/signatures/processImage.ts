/**
 * Turns a photo or scan of a signature into a small transparent PNG: paper
 * becomes transparent (by brightness), the result is trimmed to the ink and
 * scaled to fit MAX_W × MAX_H. The pixel step is pure for unit tests; the
 * canvas wrapper runs only in the browser.
 */

export const MAX_W = 600
export const MAX_H = 200
/** Data URL length budget, comfortably under the 200 KB database check. */
export const MAX_DATA_URL = 150_000

/** Brighter than this is paper (fully transparent). */
const PAPER = 225
/** Darker than this is solid ink; in between fades. */
const INK = 140
/** Alpha below this does not count as ink when trimming. */
const MIN_INK_ALPHA = 40

export interface InkBounds {
  x: number
  y: number
  width: number
  height: number
}

export type ProcessError = 'empty' | 'tooBig' | 'unreadable'

export class SignatureImageError extends Error {
  readonly code: ProcessError
  constructor(code: ProcessError) {
    super(code)
    this.code = code
  }
}

/**
 * Rewrites alpha in place from brightness (paper → 0, ink → opaque) and
 * returns the ink's bounding box, or null when there is no ink.
 */
export function paperToTransparent(data: Uint8ClampedArray, width: number, height: number): InkBounds | null {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const ink = lum >= PAPER ? 0 : lum <= INK ? 1 : (PAPER - lum) / (PAPER - INK)
      const alpha = Math.round(Math.min(data[i + 3], ink * 255))
      data[i + 3] = alpha
      if (alpha >= MIN_INK_ALPHA) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
}

/** Scale that fits `w × h` inside the box (never enlarges). */
export const fitScale = (w: number, h: number, maxW = MAX_W, maxH = MAX_H): number => Math.min(1, maxW / w, maxH / h)

const canvasOf = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

/** Browser only: decode, clean, trim, scale and encode an uploaded image. */
export async function processSignatureImage(file: Blob): Promise<{ dataUrl: string; width: number; height: number }> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new SignatureImageError('unreadable')
  }
  // Work at no more than 1600 px on the long side: plenty for a signature.
  const work = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const src = canvasOf(bitmap.width * work, bitmap.height * work)
  const sctx = src.getContext('2d', { willReadFrequently: true })
  if (!sctx) throw new SignatureImageError('unreadable')
  sctx.drawImage(bitmap, 0, 0, src.width, src.height)
  bitmap.close()

  const pixels = sctx.getImageData(0, 0, src.width, src.height)
  const bounds = paperToTransparent(pixels.data, src.width, src.height)
  if (!bounds) throw new SignatureImageError('empty')
  sctx.putImageData(pixels, 0, 0)

  // Re-encode smaller until it fits the budget.
  for (let shrink = 1; shrink >= 0.4; shrink *= 0.75) {
    const scale = fitScale(bounds.width, bounds.height) * shrink
    const out = canvasOf(bounds.width * scale, bounds.height * scale)
    const octx = out.getContext('2d')
    if (!octx) throw new SignatureImageError('unreadable')
    octx.imageSmoothingQuality = 'high'
    octx.drawImage(src, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, out.width, out.height)
    const dataUrl = out.toDataURL('image/png')
    if (dataUrl.length <= MAX_DATA_URL) return { dataUrl, width: out.width, height: out.height }
  }
  throw new SignatureImageError('tooBig')
}
