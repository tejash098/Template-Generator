import { FileDown, Printer } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { Button } from '../../components/ui/Button'
import { ICON_SIZE } from '../../config/constants'
import { BookingReport } from '../../document/BookingReport'
import { REPORT_PAGE, groupByTravelDate, paginateReport, type ReportPage } from '../../document/reportPages'
import { formatDateDdMmYyyy } from '../../document/format'
import { getExporter } from '../../export'
import { useLocale } from '../../i18n/useLocale'
import type { BookingRecord } from '../../storage/db'
import type { TravelDateRange } from '../../storage/bookings'

type Action = 'pdf' | 'print'

/** The filter's travel-date range as printed under the report title (Hindi, like the document). */
function rangeLabel({ from, to }: TravelDateRange): string {
  if (from && to)
    return from === to ? formatDateDdMmYyyy(from) : `${formatDateDdMmYyyy(from)} – ${formatDateDdMmYyyy(to)}`
  if (from) return `${formatDateDdMmYyyy(from)} से`
  if (to) return `${formatDateDdMmYyyy(to)} तक`
  return ''
}

const reportFileStem = ({ from, to }: TravelDateRange) =>
  `SRBS-bookings-${from || 'all'}${to && to !== from ? `_${to}` : ''}`.replace(/[^A-Za-z0-9._-]+/g, '_')

/** One painted frame; the timeout covers views that throttle rAF (hidden or embedded). */
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
    window.setTimeout(resolve, 100)
  })

interface ReportActionsProps {
  /** The bookings currently listed (search + travel-date filter applied). */
  rows: BookingRecord[] | undefined
  range: TravelDateRange
}

/**
 * Download PDF / Print for the day-wise bookings list. The report is mounted
 * only while an action runs, portalled to <body> and parked off-screen (still
 * laid out, so it can be captured); print.css shows only it when printing.
 */
export function ReportActions({ rows, range }: ReportActionsProps) {
  const { t } = useLocale()
  const exporter = getExporter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<ReportPage[] | null>(null)
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const subtitle = rangeLabel(range)

  /** Renders the report synchronously and waits until it is painted with its fonts. */
  const mountReport = async (): Promise<HTMLElement[]> => {
    flushSync(() => setPages(paginateReport(groupByTravelDate(rows ?? []))))
    await document.fonts.ready
    await nextFrame()
    await nextFrame()
    return [...(reportRef.current?.querySelectorAll<HTMLElement>('.report-page') ?? [])]
  }

  const run = async (action: Action, fn: (nodes: HTMLElement[]) => Promise<void>) => {
    if (busy || !rows?.length) return
    setBusy(action)
    setMessage(null)
    try {
      await fn(await mountReport())
    } catch (err) {
      setPages(null)
      setMessage(err instanceof Error ? err.message : t('export.failed'))
    } finally {
      setBusy(null)
    }
  }

  const downloadPdf = () =>
    run('pdf', async (nodes) => {
      const fileStem = reportFileStem(range)
      const title = `Shri Ram Bus Service — बुकिंग सूची${subtitle ? ` ${subtitle}` : ''}`
      const blob = await exporter.pagesToPdf(
        nodes.map((node) => ({ node, page: REPORT_PAGE, fileStem, title })),
        title,
      )
      setPages(null)
      exporter.download(blob, `${fileStem}.pdf`)
    })

  const print = () =>
    run('print', async () => {
      // Mobile browsers may return from print() before the snapshot is taken,
      // so the report stays mounted (off-screen) until afterprint.
      window.addEventListener('afterprint', () => setPages(null), {
        once: true,
      })
      await exporter.print(REPORT_PAGE)
    })

  const disabled = !rows?.length || busy !== null
  const icon = (Icon: typeof FileDown) => <Icon size={ICON_SIZE.SM} aria-hidden="true" />

  return (
    <>
      <Button disabled={disabled} onClick={downloadPdf} icon={icon(FileDown)}>
        {busy === 'pdf' ? t('export.working') : t('export.pdf')}
      </Button>
      <Button disabled={disabled} onClick={print} icon={icon(Printer)}>
        {busy === 'print' ? t('export.working') : t('export.print')}
      </Button>
      {message && (
        <span className="text-sm text-danger" role="alert">
          {message}
        </span>
      )}
      {pages &&
        createPortal(
          <div className="report-print-root pointer-events-none fixed top-0 -left-[300vw]" aria-hidden="true">
            <BookingReport pages={pages} subtitle={subtitle} ref={reportRef} />
          </div>,
          document.body,
        )}
    </>
  )
}
