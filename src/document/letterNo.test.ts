import { describe, expect, it } from 'vitest'
import { formatLetterNo } from './letterNo'

describe('formatLetterNo', () => {
  it('zero-pads to four digits', () => {
    expect(formatLetterNo(1)).toBe('0001')
    expect(formatLetterNo(123)).toBe('0123')
    expect(formatLetterNo(12345)).toBe('12345')
  })

  it('applies a prefix', () => {
    expect(formatLetterNo(7, 'SRBS/')).toBe('SRBS/0007')
  })

  it('rejects non-positive or fractional sequences', () => {
    expect(() => formatLetterNo(0)).toThrow()
    expect(() => formatLetterNo(1.5)).toThrow()
  })
})
