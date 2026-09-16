import { FileDown, Image, Printer, Share2 } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { Button } from '../../components/ui/Button'
import { ICON_SIZE } from '../../config/constants'
import { pageDimensionsMm, type PageSpec } from '../../document/pageSizes'
import { getExporter, type ExportJob, type ImageFormat } from '../../export'
import { useLocale } from '../../i18n/useLocale'

interface ExportBarProps {
  sheetRef: RefObject<HTMLDivElement | null>
  page: PageSpec
  fileStem: string
  title: string
  /** Exporting a booking that has not been saved yet is disabled. */
  ready: boolean
}

type Action = 'pdf' | 'png' | 'jpeg' | 'print' | 'share-pdf' | 'share-image'

export function ExportBar({ sheetRef, page, fileStem, title, ready }: ExportBarProps) {
  const { t } = useLocale()
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
      setMessage(err instanceof Error ? err.message : t('export.failed'))
    } finally {
      setBusy(null)
    }
  }

  const downloadPdf = () => run('pdf', async (j) => exporter.download(await exporter.toPdf(j), `${fileStem}.pdf`))

  const downloadImage = (format: ImageFormat) =>
    run(format, async (j) =>
      exporter.download(await exporter.toImage(j, format), `${fileStem}.${format === 'png' ? 'png' : 'jpg'}`),
    )

  const print = () => run('print', () => exporter.print(dims))

  const share = (kind: 'pdf' | 'image') =>
    run(kind === 'pdf' ? 'share-pdf' : 'share-image', async (j) => {
      const blob = kind === 'pdf' ? await exporter.toPdf(j) : await exporter.toImage(j, 'png')
      const result = await exporter.share(blob, `${fileStem}.${kind === 'pdf' ? 'pdf' : 'png'}`, title)
      if (result === 'unsupported') setMessage(t('export.shareUnsupported'))
    })

  const disabled = !ready || busy !== null
  const label = (action: Action, text: string) => (busy === action ? t('export.working') : text)
  const icon = (Icon: typeof FileDown) => <Icon size={ICON_SIZE.SM} aria-hidden="true" />

  return (
    <div className="mt-5 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" disabled={disabled} onClick={downloadPdf} icon={icon(FileDown)}>
          {label('pdf', t('export.pdf'))}
        </Button>
        <Button disabled={disabled} onClick={() => downloadImage('png')} icon={icon(Image)}>
          {label('png', t('export.png'))}
        </Button>
        <Button disabled={disabled} onClick={() => downloadImage('jpeg')} icon={icon(Image)}>
          {label('jpeg', t('export.jpg'))}
        </Button>
        <Button disabled={disabled} onClick={print} icon={icon(Printer)}>
          {label('print', t('export.print'))}
        </Button>
        {exporter.canShare() && (
          <>
            <Button disabled={disabled} onClick={() => share('image')} icon={icon(Share2)}>
              {label('share-image', t('export.shareImage'))}
            </Button>
            <Button disabled={disabled} onClick={() => share('pdf')} icon={icon(Share2)}>
              {label('share-pdf', t('export.sharePdf'))}
            </Button>
          </>
        )}
      </div>
      {!ready && <p className="mt-2 text-xs text-text-secondary">{t('export.notReady')}</p>}
      {ready && exporter.pdfKind === 'raster' && <p className="mt-2 text-xs text-text-secondary">{t('export.rasterHint')}</p>}
      {message && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}
