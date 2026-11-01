/**
 * Drawn signatures: raw pointer strokes in, compact integer strokes and a
 * smoothed SVG path out. Pure so it can be unit-tested and shared by the pad
 * (features/signatures) and the sheet.
 */

/** Height every drawn signature is normalised to (viewBox units). */
export const DRAWN_HEIGHT = 200

/** Padding kept around the ink so round caps are not clipped. */
const PAD = 6

export interface NormalizedStrokes {
  width: number
  height: number
  strokes: number[][]
}

/**
 * Trims raw strokes (flat x,y lists in any units) to their bounding box,
 * scales them to DRAWN_HEIGHT and rounds to integers. Returns null when there
 * is no ink at all.
 */
export function normalizeStrokes(raw: number[][]): NormalizedStrokes | null {
  const strokes = raw.filter((s) => s.length >= 2)
  if (!strokes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes) {
    for (let i = 0; i < s.length; i += 2) {
      minX = Math.min(minX, s[i])
      maxX = Math.max(maxX, s[i])
      minY = Math.min(minY, s[i + 1])
      maxY = Math.max(maxY, s[i + 1])
    }
  }
  const inkH = Math.max(maxY - minY, 1)
  const scale = (DRAWN_HEIGHT - PAD * 2) / inkH
  const out = strokes.map((s) => {
    const pts: number[] = []
    for (let i = 0; i < s.length; i += 2) {
      const x = Math.round((s[i] - minX) * scale + PAD)
      const y = Math.round((s[i + 1] - minY) * scale + PAD)
      // Drop points that round onto the previous one.
      if (pts.length && pts[pts.length - 2] === x && pts[pts.length - 1] === y) continue
      pts.push(x, y)
    }
    return pts
  })
  const width = Math.max(Math.round((maxX - minX) * scale) + PAD * 2, PAD * 2 + 1)
  return { width, height: DRAWN_HEIGHT, strokes: out }
}

/**
 * One SVG path per stroke: quadratic curves through the midpoints of
 * consecutive points, so corners come out smooth. A single point becomes a dot.
 */
export function strokeToPath(s: number[]): string {
  if (s.length < 2) return ''
  if (s.length === 2) return `M${s[0]} ${s[1]}l0.01 0`
  if (s.length === 4) return `M${s[0]} ${s[1]}L${s[2]} ${s[3]}`
  let d = `M${s[0]} ${s[1]}`
  for (let i = 2; i < s.length - 2; i += 2) {
    const mx = (s[i] + s[i + 2]) / 2
    const my = (s[i + 1] + s[i + 3]) / 2
    d += `Q${s[i]} ${s[i + 1]} ${mx} ${my}`
  }
  d += `L${s[s.length - 2]} ${s[s.length - 1]}`
  return d
}
