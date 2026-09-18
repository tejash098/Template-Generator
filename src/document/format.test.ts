import { describe, expect, it } from 'vitest'
import { fileStem, formatDateDdMmYyyy, formatRupees, nextDayIso, todayIso } from './format'

describe('dates', () => {
  it('formats ISO dates as dd/mm/yyyy', () => {
    expect(formatDateDdMmYyyy('2026-09-16')).toBe('16/09/2026')
  })

  it('passes through anything that is not an ISO date', () => {
    expect(formatDateDdMmYyyy('')).toBe('')
    expect(formatDateDdMmYyyy('16/09/2026')).toBe('16/09/2026')
  })

  it('builds today in local time', () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('finds the next day across month and year ends', () => {
    expect(nextDayIso('2026-09-18')).toBe('2026-09-19')
    expect(nextDayIso('2026-02-28')).toBe('2026-03-01')
    expect(nextDayIso('2028-02-28')).toBe('2028-02-29')
    expect(nextDayIso('2026-12-31')).toBe('2027-01-01')
    expect(nextDayIso('')).toBe('')
    expect(nextDayIso('18/09/2026')).toBe('')
  })
})

describe('fileStem', () => {
  it('produces a filesystem-safe name', () => {
    expect(fileStem('0001', '2026-09-16')).toBe('SRBS-0001-2026-09-16')
    expect(fileStem('SRBS/0001', '2026-09-16')).toBe('SRBS-SRBS_0001-2026-09-16')
  })
})

describe('formatRupees', () => {
  it('writes amounts the way the pad does', () => {
    expect(formatRupees(15000)).toBe('15000/-')
    expect(formatRupees(2100.6)).toBe('2101/-')
  })
})
