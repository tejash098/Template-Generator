import { FileDown, Image, Link2, Printer, Share2 } from 'lucide-react'
import { useState, type RefObject } from 'react'
import { createShareLink, type ShareKind } from '../../cloud/shareFiles'
import { useAuth } from '../../cloud/useAuth'
import { Button } from '../../components/ui/Button'
import { ICON_SIZE } from '../../config/constants'
import { pageDimensionsMm, type PageSpec } from '../../document/pageSizes'
import { getExporter, type ExportJob, type ImageFormat } from '../../export'
import { useLocale } from '../../i18n/useLocale'
import { db } from '../../storage/db'

interface ExportBarProps {
  sheetRef: RefObject<HTMLDivElement | null>
  page: PageSpec
  fileStem: string
  title: string
  /** Exporting a booking that has not been saved yet is disabled. */
  ready: boolean
  /** Saved booking id; needed for share links. */
  bookingId?: string
}

type Action = 'pdf' | 'png' | 'jpeg' | 'print' | 'share-pdf' | 'share-image' | 'link-pdf' | 'link-png'

export function ExportBar({ sheetRef, page, fileStem, title, ready, bookingId }: ExportBarProps) {
  const { t } = useLocale()
  const { status: authStatus, membership, api } = useAuth()
  const exporter = getExporter()
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const dims = pageDimensionsMm(page)
  const canShareLink = authStatus === 'member' && !!membership && !!api && !!bookingId

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

  const shareLink = (kind: ShareKind) =>
    run(kind === 'pdf' ? 'link-pdf' : 'link-png', async (j) => {
      if (!api || !membership || !bookingId) return
      setNotice(t('share.preparing'))
      try {
        const url = await createShareLink({
          api,
          db,
          bookingId,
          organizationId: membership.organizationId,
          kind,
          render: () => (kind === 'pdf' ? exporter.toPdf(j) : exporter.toImage(j, 'png')),
        })
        if (typeof navigator.share === 'function') {
          try {
            await navigator.share({ url, title })
            setNotice(t('share.opened'))
            return
          } catch (err) {
            if ((err as Error).name === 'AbortError') {
              setNotice(null)
              return
            }
          }
        }
        await navigator.clipboard.writeText(url)
        setNotice(t('share.copied'))
      } catch (err) {
        setNotice(null)
        throw new Error(t('share.failed', { error: err instanceof Error ? err.message : String(err) }), { cause: err })
      }
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
        {canShareLink && (
          <>
            <Button disabled={disabled} onClick={() => shareLink('pdf')} icon={icon(Link2)}>
              {label('link-pdf', t('share.linkPdf'))}
            </Button>
            <Button disabled={disabled} onClick={() => shareLink('png')} icon={icon(Link2)}>
              {label('link-png', t('share.linkImage'))}
            </Button>
          </>
        )}
      </div>
      {notice && (
        <p className="mt-2 text-sm text-success" role="status">
          {notice}
        </p>
      )}
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
