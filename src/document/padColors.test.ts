import { describe, expect, it } from 'vitest'
import { DEFAULT_PAD_COLOR, PAD_COLORS, PAD_COLOR_IDS, isPadColorId } from './padColors'

describe('pad colours', () => {
  it('offers five ink colours plus the blank pad, navy as default', () => {
    expect(PAD_COLOR_IDS).toHaveLength(6)
    for (const id of PAD_COLOR_IDS) expect(PAD_COLORS[id].hex).toMatch(/^#[0-9a-f]{6}$/)
    expect(DEFAULT_PAD_COLOR).toBe('navy')
  })

  it('marks only the blank option as pre-printed', () => {
    expect(PAD_COLORS.blank.preprinted).toBe(true)
    for (const id of PAD_COLOR_IDS) if (id !== 'blank') expect(PAD_COLORS[id].preprinted).toBeUndefined()
  })

  it('validates ids from untrusted input', () => {
    expect(isPadColorId('orange')).toBe(true)
    expect(isPadColorId('pink')).toBe(false)
    expect(isPadColorId(null)).toBe(false)
  })
})
