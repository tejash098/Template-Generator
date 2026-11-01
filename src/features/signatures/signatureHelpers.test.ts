import { describe, expect, it } from 'vitest'
import { fitScale, paperToTransparent } from './processImage'
import { safeReturnPath, withSignatureParam } from './returnPath'

/** RGBA pixels from a grid of grey levels. */
const grey = (rows: number[][]): Uint8ClampedArray =>
  Uint8ClampedArray.from(rows.flat().flatMap((v) => [v, v, v, 255]))

describe('paperToTransparent', () => {
  it('makes paper transparent, keeps ink opaque and finds the ink box', () => {
    const data = grey([
      [255, 255, 255, 255],
      [255, 20, 250, 255],
      [255, 255, 30, 255],
    ])
    const bounds = paperToTransparent(data, 4, 3)
    expect(bounds).toEqual({ x: 1, y: 1, width: 2, height: 2 })
    expect(data[3]).toBe(0) // corner paper
    expect(data[(1 * 4 + 1) * 4 + 3]).toBe(255) // dark ink
    expect(data[(1 * 4 + 2) * 4 + 3]).toBe(0) // off-white paper
  })

  it('fades mid-tones and reports no ink on a blank page', () => {
    const mid = grey([[180]])
    paperToTransparent(mid, 1, 1)
    expect(mid[3]).toBeGreaterThan(0)
    expect(mid[3]).toBeLessThan(255)
    expect(paperToTransparent(grey([[255, 240]]), 2, 1)).toBeNull()
  })

  it('fits inside 600 × 200 without enlarging', () => {
    expect(fitScale(1200, 200)).toBe(0.5)
    expect(fitScale(300, 400)).toBe(0.5)
    expect(fitScale(100, 50)).toBe(1)
  })
})

describe('return path', () => {
  it('accepts only the editor routes', () => {
    expect(safeReturnPath('/bookings/3e168ded-14d3-4771-a2b7-69bbeef9ba70')).toBe('/bookings/3e168ded-14d3-4771-a2b7-69bbeef9ba70')
    expect(safeReturnPath('/new?template=bus-booking&color=navy')).toBe('/new?template=bus-booking&color=navy')
    expect(safeReturnPath(null)).toBeNull()
    expect(safeReturnPath('https://evil.example/bookings/1')).toBeNull()
    expect(safeReturnPath('//evil.example/new')).toBeNull()
    expect(safeReturnPath('/team')).toBeNull()
    expect(safeReturnPath('/bookings/../team')).toBeNull()
  })

  it('sets the signature parameter, replacing an earlier one', () => {
    expect(withSignatureParam('/bookings/b1', 's1')).toBe('/bookings/b1?signature=s1')
    expect(withSignatureParam('/new?template=bus-booking&color=navy&signature=old', 's2')).toBe(
      '/new?template=bus-booking&color=navy&signature=s2',
    )
  })
})
