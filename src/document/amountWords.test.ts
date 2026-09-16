import { describe, expect, it } from 'vitest'
import { HINDI_ONES, amountToHindiWords, rupeesInWords } from './amountWords'

describe('amountToHindiWords', () => {
  it('has a unique name for every number 0–99', () => {
    expect(HINDI_ONES).toHaveLength(100)
    expect(new Set(HINDI_ONES).size).toBe(100)
  })

  it.each([
    [0, 'शून्य'],
    [1, 'एक'],
    [7, 'सात'],
    [15, 'पंद्रह'],
    [20, 'बीस'],
    [21, 'इक्कीस'],
    [49, 'उनचास'],
    [99, 'निन्यानवे'],
    [100, 'एक सौ'],
    [101, 'एक सौ एक'],
    [500, 'पाँच सौ'],
    [1500, 'एक हजार पाँच सौ'],
    [2101, 'दो हजार एक सौ एक'],
    [5500, 'पाँच हजार पाँच सौ'],
    [12001, 'बारह हजार एक'],
    [15000, 'पंद्रह हजार'],
    [99999, 'निन्यानवे हजार नौ सौ निन्यानवे'],
    [100000, 'एक लाख'],
    [250000, 'दो लाख पचास हजार'],
    [1000000, 'दस लाख'],
    [10000000, 'एक करोड़'],
    [12345678, 'एक करोड़ तेईस लाख पैंतालीस हजार छह सौ अठहत्तर'],
    [1500000000, 'एक सौ पचास करोड़'],
  ])('%i → %s', (amount, words) => {
    expect(amountToHindiWords(amount)).toBe(words)
  })

  it('rejects negatives, fractions and absurd amounts', () => {
    expect(() => amountToHindiWords(-1)).toThrow(RangeError)
    expect(() => amountToHindiWords(1.5)).toThrow(RangeError)
    expect(() => amountToHindiWords(1e13)).toThrow(RangeError)
  })

  it('formats the formal receipt phrase', () => {
    expect(rupeesInWords(15000)).toBe('पंद्रह हजार रुपये मात्र')
  })
})
