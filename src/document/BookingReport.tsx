import type { CSSProperties, Ref } from 'react'
import { bookingBalance } from './bookingText'
import { REPORT_LAYOUT, REPORT_PAGE, type ReportPage } from './reportPages'
import { formatDateDdMmYyyy, formatRupees } from './format'
import { LETTERHEAD, REPORT_TEXT } from './letterheadContent'
import './report.css'

interface BookingReportProps {
  pages: ReportPage[]
  /** Printed under the title, e.g. the travel-date range of the filter. */
  subtitle?: string
  /** On the wrapper; each page inside is a `.report-page` element at 1:1. */
  ref?: Ref<HTMLDivElement>
}

const L = REPORT_LAYOUT
const style = {
  '--page-w': `${REPORT_PAGE.widthMm}mm`,
  '--page-h': `${REPORT_PAGE.heightMm}mm`,
  '--margin': `${L.marginMm}mm`,
  '--title-h': `${L.titleMm}mm`,
  '--footer-h': `${L.footerMm}mm`,
  '--heading-h': `${L.headingMm}mm`,
  '--thead-h': `${L.theadMm}mm`,
  '--row-h': `${L.rowMm}mm`,
  '--gap': `${L.gapMm}mm`,
} as CSSProperties

/**
 * The day-wise bookings list as A4 pages (pagination from reportPages.ts).
 * Like the sheet, pages are sized in mm and never transformed, so the exporter
 * captures each one at 1:1 and print lays them out as-is.
 */
export function BookingReport({ pages, subtitle, ref }: BookingReportProps) {
  return (
    <div className="report" ref={ref} lang="hi">
      {pages.map((page, p) => (
        <div className="report-page" style={style} key={p}>
          <header className="report-title">
            <div className="report-title-name">{LETTERHEAD.title}</div>
            <div className="report-title-sub">
              {REPORT_TEXT.heading}
              {subtitle && <span className="report-title-range"> · {subtitle}</span>}
            </div>
          </header>
          <div className="report-body">
            {page.sections.map((section) => (
              <section className="report-section" key={`${section.date}-${section.rows[0]?.serial}`}>
                <h2 className="report-date">
                  {REPORT_TEXT.dateLabel} {section.date ? formatDateDdMmYyyy(section.date) : REPORT_TEXT.noDate}
                  {section.continued && <span className="report-continued"> {REPORT_TEXT.continued}</span>}
                </h2>
                <table className="report-table">
                  <colgroup>
                    <col className="report-col-serial" />
                    <col className="report-col-route" />
                    <col className="report-col-amounts" />
                    <col className="report-col-blank" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>{REPORT_TEXT.serial}</th>
                      <th>{REPORT_TEXT.route}</th>
                      <th>{REPORT_TEXT.amounts}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map(({ serial, booking: b }) => (
                      <tr key={b.id}>
                        <td className="report-serial">{serial}</td>
                        <td>
                          <div className="report-route">
                            {b.from || '—'} – {b.to || '—'}
                          </div>
                        </td>
                        <td className="report-amounts">
                          <div>
                            {REPORT_TEXT.total} {formatRupees(b.fare)}
                          </div>
                          <div>
                            {REPORT_TEXT.advance} {formatRupees(b.advance)}
                          </div>
                          <div>
                            {REPORT_TEXT.balance} {formatRupees(bookingBalance(b))}
                          </div>
                        </td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
          <footer className="report-footer">
            {REPORT_TEXT.page} {p + 1} / {pages.length}
          </footer>
        </div>
      ))}
    </div>
  )
}
