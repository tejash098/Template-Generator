import { useState, type RefObject } from 'react'
import { pageDimensionsMm, type PageSpec } from '../../document/pageSizes'
import { getExporter, type ExportJob, type ImageFormat } from '../../export'

interface ExportBarProps {
  sheetRef: RefObject<HTMLDivElement | null>
  page: PageSpec
  fileStem: string
  title: string
  /** Exporting a letter that has not been saved yet is disabled. */
  ready: boolean
}

type Action = 'pdf' | 'png' | 'jpeg' | 'print' | 'share-pdf' | 'share-image'

export function ExportBar({ sheetRef, page, fileStem, title, ready }: ExportBarProps) {
  const exporter = getExporter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const dims = pageDimensionsMm(page)

  const job = (): ExportJob | null =>
    sheetRef.current ? { node: sheetRef.current, page: dims, fileStem, title } : null

  const run = async (action: Action, fn: (job: ExportJob) => Promise<void>) => {
    const j = job()
    if (busy || !j) return
    setBusy(action)
    setMessage(null)
    try {
      await fn(j)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const downloadPdf = () =>
    run('pdf', async (j) => exporter.download(await exporter.toPdf(j), `${fileStem}.pdf`))

  const downloadImage = (format: ImageFormat) =>
    run(format, async (j) =>
      exporter.download(await exporter.toImage(j, format), `${fileStem}.${format === 'png' ? 'png' : 'jpg'}`),
    )

  const print = () => run('print', () => exporter.print(dims))

  const share = (kind: 'pdf' | 'image') =>
    run(kind === 'pdf' ? 'share-pdf' : 'share-image', async (j) => {
      const blob = kind === 'pdf' ? await exporter.toPdf(j) : await exporter.toImage(j, 'png')
      const result = await exporter.share(blob, `${fileStem}.${kind === 'pdf' ? 'pdf' : 'png'}`, title)
      if (result === 'unsupported') setMessage('Sharing is not available in this browser. Use Download instead.')
    })

  const disabled = !ready || busy !== null
  const label = (action: Action, text: string) => (busy === action ? 'Working…' : text)

  return (
    <div className="export-bar">
      <div className="export-buttons">
        <button type="button" className="btn btn-primary" disabled={disabled} onClick={downloadPdf}>
          {label('pdf', 'Download PDF')}
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={() => downloadImage('png')}>
          {label('png', 'Download PNG')}
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={() => downloadImage('jpeg')}>
          {label('jpeg', 'Download JPG')}
        </button>
        <button type="button" className="btn" disabled={disabled} onClick={print}>
          {label('print', 'Print')}
        </button>
        {exporter.canShare() && (
          <>
            <button type="button" className="btn" disabled={disabled} onClick={() => share('image')}>
              {label('share-image', 'Share image')}
            </button>
            <button type="button" className="btn" disabled={disabled} onClick={() => share('pdf')}>
              {label('share-pdf', 'Share PDF')}
            </button>
          </>
        )}
      </div>
      {!ready && <p className="hint">Start typing — the letter is saved automatically and can then be exported.</p>}
      {ready && exporter.pdfKind === 'raster' && (
        <p className="hint">
          PDF downloads here are image-based. For a text-selectable PDF use Print and choose “Save as PDF”.
        </p>
      )}
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
