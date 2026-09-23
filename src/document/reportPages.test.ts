import { describe, expect, it } from 'vitest'
import { REPORT_LAYOUT, groupByTravelDate, paginateReport, reportBodyMm, type ReportBooking } from './reportPages'

let n = 0
const booking = (travelDate: string, bookingNo = `B/${String(++n).padStart(4, '0')}`): ReportBooking => ({
  id: bookingNo,
  bookingNo,
  travelDate,
  from: 'भभुआ',
  to: 'पटना',
  fare: 10000,
  advance: 2000,
})

const many = (count: number, date: string) => Array.from({ length: count }, () => booking(date))

/** Rows that fit under one heading on an empty page. */
const firstFit = Math.floor((reportBodyMm() - REPORT_LAYOUT.headingMm - REPORT_LAYOUT.theadMm) / REPORT_LAYOUT.rowMm)

describe('groupByTravelDate', () => {
  it('orders dates oldest first, undated last, and rows by booking number', () => {
    const groups = groupByTravelDate([
      booking('2026-09-20', 'B/0010'),
      booking('', 'B/0003'),
      booking('2026-09-18', 'B/0009'),
      booking('2026-09-20', 'B/0002'),
    ])
    expect(groups.map((g) => g.date)).toEqual(['2026-09-18', '2026-09-20', ''])
    expect(groups[1].rows.map((r) => r.bookingNo)).toEqual(['B/0002', 'B/0010'])
  })

  it('returns nothing for no bookings', () => {
    expect(groupByTravelDate([])).toEqual([])
    expect(paginateReport([])).toEqual([])
  })
})

describe('paginateReport', () => {
  it('restarts the serial for every date', () => {
    const pages = paginateReport(groupByTravelDate([...many(2, '2026-09-18'), ...many(3, '2026-09-19')]))
    expect(pages).toHaveLength(1)
    expect(pages[0].sections.map((s) => s.rows.map((r) => r.serial))).toEqual([
      [1, 2],
      [1, 2, 3],
    ])
  })

  it('continues a long date on the next page with a repeated heading and running serials', () => {
    const pages = paginateReport(groupByTravelDate(many(firstFit + 3, '2026-09-18')))
    expect(pages).toHaveLength(2)
    expect(pages[0].sections[0]).toMatchObject({ continued: false })
    expect(pages[0].sections[0].rows).toHaveLength(firstFit)
    expect(pages[1].sections[0].continued).toBe(true)
    expect(pages[1].sections[0].rows.map((r) => r.serial)).toEqual([firstFit + 1, firstFit + 2, firstFit + 3])
  })

  it('never leaves a date heading without rows at the bottom of a page', () => {
    const pages = paginateReport(groupByTravelDate([...many(firstFit, '2026-09-18'), ...many(2, '2026-09-19')]))
    expect(pages).toHaveLength(2)
    expect(pages[0].sections).toHaveLength(1)
    expect(pages[1].sections[0]).toMatchObject({
      date: '2026-09-19',
      continued: false,
    })
    for (const page of pages) for (const s of page.sections) expect(s.rows.length).toBeGreaterThan(0)
  })

  it('keeps every page within the printable height', () => {
    const pages = paginateReport(
      groupByTravelDate([...many(5, '2026-09-18'), ...many(20, '2026-09-19'), ...many(7, '2026-09-21')]),
    )
    const { gapMm, headingMm, theadMm, rowMm } = REPORT_LAYOUT
    for (const page of pages) {
      const height = page.sections.reduce(
        (sum, s, i) => sum + (i ? gapMm : 0) + headingMm + theadMm + s.rows.length * rowMm,
        0,
      )
      expect(height).toBeLessThanOrEqual(reportBodyMm())
    }
    expect(pages.flatMap((p) => p.sections.flatMap((s) => s.rows))).toHaveLength(32)
  })
})
