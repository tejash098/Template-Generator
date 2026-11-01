import { describe, expect, it } from 'vitest'
import { asSignatureMark, MAX_SIGNATURE_BYTES } from './signature'
import { fontsForText, scriptOf, SIGNATURE_FONTS } from './signatureFonts'
import { DRAWN_HEIGHT, normalizeStrokes, strokeToPath } from './signaturePath'

describe('signature fonts', () => {
  it('offers eight styles per script, each with a unique id', () => {
    expect(fontsForText('Sunil Kumar')).toHaveLength(8)
    expect(fontsForText('सुनील कुमार')).toHaveLength(8)
    expect(new Set(SIGNATURE_FONTS.map((f) => f.id)).size).toBe(SIGNATURE_FONTS.length)
  })

  it('switches to the Devanagari set as soon as Hindi is typed', () => {
    expect(scriptOf('')).toBe('latin')
    expect(scriptOf('Sunil सुनील')).toBe('devanagari')
    expect(fontsForText('सुनील').every((f) => f.script === 'devanagari')).toBe(true)
    expect(fontsForText('Sunil').every((f) => f.script === 'latin')).toBe(true)
  })
})

describe('asSignatureMark', () => {
  it('accepts the three valid kinds', () => {
    expect(asSignatureMark({ kind: 'typed', text: 'Sunil', font: 'great-vibes', ink: 'blue' })).not.toBeNull()
    expect(asSignatureMark({ kind: 'drawn', width: 300, height: 200, strokes: [[1, 2, 3, 4]], ink: 'black' })).not.toBeNull()
    expect(asSignatureMark({ kind: 'image', dataUrl: 'data:image/png;base64,AAAA', width: 60, height: 20 })).not.toBeNull()
  })

  it('rejects anything malformed, unknown or unsafe', () => {
    expect(asSignatureMark(null)).toBeNull()
    expect(asSignatureMark('Sunil')).toBeNull()
    expect(asSignatureMark({ kind: 'stamp' })).toBeNull()
    expect(asSignatureMark({ kind: 'typed', text: '  ', font: 'great-vibes', ink: 'blue' })).toBeNull()
    expect(asSignatureMark({ kind: 'typed', text: 'Sunil', font: 'comic-sans', ink: 'blue' })).toBeNull()
    expect(asSignatureMark({ kind: 'typed', text: 'Sunil', font: 'great-vibes', ink: 'red' })).toBeNull()
    expect(asSignatureMark({ kind: 'drawn', width: 300, height: 200, strokes: [[1, 2, 3]], ink: 'blue' })).toBeNull()
    expect(asSignatureMark({ kind: 'drawn', width: 300, height: 200, strokes: [], ink: 'blue' })).toBeNull()
    expect(asSignatureMark({ kind: 'image', dataUrl: 'data:image/svg+xml;base64,AAAA', width: 6, height: 2 })).toBeNull()
    expect(asSignatureMark({ kind: 'image', dataUrl: 'https://example.com/s.png', width: 6, height: 2 })).toBeNull()
    const huge = 'data:image/png;base64,' + 'A'.repeat(MAX_SIGNATURE_BYTES)
    expect(asSignatureMark({ kind: 'image', dataUrl: huge, width: 6, height: 2 })).toBeNull()
  })

  it('drops unknown extra properties', () => {
    const mark = asSignatureMark({ kind: 'typed', text: 'Sunil', font: 'kalam', ink: 'blue', onclick: 'x' })
    expect(mark).toEqual({ kind: 'typed', text: 'Sunil', font: 'kalam', ink: 'blue' })
  })
})

describe('drawn strokes', () => {
  it('normalises to the ink box at a fixed height with integer points', () => {
    const n = normalizeStrokes([
      [100, 50, 150, 75],
      [200, 100],
    ])
    expect(n).not.toBeNull()
    expect(n?.height).toBe(DRAWN_HEIGHT)
    // 50 px of ink becomes 188 units (200 minus 6 padding each side): scale 3.76.
    expect(n?.strokes[0]).toEqual([6, 6, 194, 100])
    expect(n?.strokes[1]).toEqual([382, 194])
    expect(n?.width).toBe(388)
    expect(n?.strokes.flat().every(Number.isInteger)).toBe(true)
  })

  it('returns null without ink and drops repeated points', () => {
    expect(normalizeStrokes([])).toBeNull()
    expect(normalizeStrokes([[1]])).toBeNull()
    const n = normalizeStrokes([[0, 0, 0.001, 0, 10, 10]])
    expect(n?.strokes[0]).toHaveLength(4)
  })

  it('draws dots, lines and smoothed curves', () => {
    expect(strokeToPath([5, 5])).toBe('M5 5l0.01 0')
    expect(strokeToPath([0, 0, 10, 0])).toBe('M0 0L10 0')
    expect(strokeToPath([0, 0, 10, 10, 20, 0])).toBe('M0 0Q10 10 15 5L20 0')
  })
})
