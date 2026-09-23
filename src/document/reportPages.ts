import { PAGE_SIZES, type PageDimensionsMm } from './pageSizes'

/**
 * The day-wise bookings list (Bookings page → Download PDF / Print): bookings
 * grouped by travel date, one small table per date, laid out on A4 pages.
 *
 * Rows have a fixed height, so pagination is plain arithmetic in millimetres
 * rather than DOM measurement; BookingReport.tsx renders exactly these pages.
 */

/** The fields of a booking the report prints. */
export interface ReportBooking {
  id: string
  bookingNo: string
  travelDate: string
  from: string
  to: string
  fare: number
  advance: number
}

export interface ReportGroup<T extends ReportBooking = ReportBooking> {
  /** ISO yyyy-mm-dd, or '' for bookings without a travel date. */
  date: string
  rows: T[]
}

export interface ReportSection<T extends ReportBooking = ReportBooking> {
  date: string
  /** True when this date's table started on an earlier page. */
  continued: boolean
  rows: { serial: number; booking: T }[]
}

export interface ReportPage<T extends ReportBooking = ReportBooking> {
  sections: ReportSection<T>[]
}

export const REPORT_PAGE: PageDimensionsMm = {
  widthMm: PAGE_SIZES.a4.widthMm,
  heightMm: PAGE_SIZES.a4.heightMm,
}

/** Report geometry in mm; report.css reads these through custom properties. */
export const REPORT_LAYOUT = {
  marginMm: 12,
  titleMm: 22,
  footerMm: 8,
  headingMm: 10,
  theadMm: 9,
  rowMm: 17,
  gapMm: 4,
} as const

export type ReportLayout = typeof REPORT_LAYOUT

/** Height left for tables on one page. */
export const reportBodyMm = (layout: ReportLayout = REPORT_LAYOUT, page: PageDimensionsMm = REPORT_PAGE): number =>
  page.heightMm - 2 * layout.marginMm - layout.titleMm - layout.footerMm

const byBookingNo = (a: ReportBooking, b: ReportBooking) =>
  a.bookingNo.localeCompare(b.bookingNo, 'en', { numeric: true })

/** Groups by travel date, oldest first; undated bookings come last. */
export function groupByTravelDate<T extends ReportBooking>(rows: readonly T[]): ReportGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const date = row.travelDate || ''
    const list = map.get(date)
    if (list) list.push(row)
    else map.set(date, [row])
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(([date, list]) => ({ date, rows: [...list].sort(byBookingNo) }))
}

/**
 * Lays the groups onto pages. Each section costs a date heading + table header;
 * a date that does not fit continues on the next page under a repeated heading,
 * and its serial numbers keep counting. A heading is never left without rows.
 */
export function paginateReport<T extends ReportBooking>(
  groups: readonly ReportGroup<T>[],
  layout: ReportLayout = REPORT_LAYOUT,
  page: PageDimensionsMm = REPORT_PAGE,
): ReportPage<T>[] {
  const bodyMm = reportBodyMm(layout, page)
  const pages: ReportPage<T>[] = []
  let current: ReportPage<T> = { sections: [] }
  let used = 0

  const nextPage = () => {
    pages.push(current)
    current = { sections: [] }
    used = 0
  }

  for (const group of groups) {
    let i = 0
    let serial = 1
    let continued = false
    while (i < group.rows.length) {
      const startMm = (current.sections.length ? layout.gapMm : 0) + layout.headingMm + layout.theadMm
      if (current.sections.length && used + startMm + layout.rowMm > bodyMm) {
        nextPage()
        continue
      }
      const fits = Math.max(1, Math.floor((bodyMm - used - startMm) / layout.rowMm))
      const take = group.rows.slice(i, i + fits)
      current.sections.push({
        date: group.date,
        continued,
        rows: take.map((booking) => ({ serial: serial++, booking })),
      })
      used += startMm + take.length * layout.rowMm
      i += take.length
      continued = true
      if (i < group.rows.length) nextPage()
    }
  }
  if (current.sections.length) pages.push(current)
  return pages
}
