import { describe, expect, it } from 'vitest'
import { formatTimeHindi, periodOfDay } from './hindiTime'

describe('periodOfDay', () => {
  it.each([
    [0, 'रात'],
    [3, 'रात'],
    [4, 'सुबह'],
    [11, 'सुबह'],
    [12, 'दोपहर'],
    [13, 'दोपहर'],
    [14, 'शाम'],
    [19, 'शाम'],
    [20, 'रात'],
    [23, 'रात'],
  ])('%i h → %s', (hour, period) => {
    expect(periodOfDay(hour)).toBe(period)
  })
})

describe('formatTimeHindi', () => {
  it.each([
    ['14:00', 'शाम 2 बजे'],
    ['17:00', 'शाम 5 बजे'],
    ['06:00', 'सुबह 6 बजे'],
    ['12:00', 'दोपहर 12 बजे'],
    ['00:00', 'रात 12 बजे'],
    ['01:30', 'रात डेढ़ बजे'],
    ['02:30', 'रात ढाई बजे'],
    ['18:30', 'शाम साढ़े 6 बजे'],
    ['14:10', 'शाम 2:10 बजे'],
    ['9:05', 'सुबह 9:05 बजे'],
  ])('%s → %s', (input, expected) => {
    expect(formatTimeHindi(input)).toBe(expected)
  })

  it('returns an empty string for empty or malformed input', () => {
    expect(formatTimeHindi('')).toBe('')
    expect(formatTimeHindi('noon')).toBe('')
    expect(formatTimeHindi('25:00')).toBe('')
    expect(formatTimeHindi('10:75')).toBe('')
  })
})
