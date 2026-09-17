import type { AppDb } from '../storage/db'
import { emitBookingsChanged } from '../storage/events'
import type { CloudApi } from './cloudApi'

/*
 * Share links open a hosted copy of the rendered receipt (the one exception to
 * "store form data only"). One file per booking per kind, replaced only when
 * the booking changed since it was rendered; the link is a signed URL.
 */

export type ShareKind = 'pdf' | 'png'

export const SHARE_LINK_TTL_SECONDS = 365 * 24 * 60 * 60

const CONTENT_TYPE: Record<ShareKind, string> = { pdf: 'application/pdf', png: 'image/png' }

export interface ShareLinkOptions {
  api: CloudApi
  db: AppDb
  bookingId: string
  organizationId: string
  kind: ShareKind
  /** Renders the current sheet; only called when no fresh file exists. */
  render: () => Promise<Blob>
}

export const shareFilePath = (organizationId: string, bookingId: string, kind: ShareKind): string =>
  `${organizationId}/${bookingId}/receipt.${kind}`

export async function createShareLink({ api, db, bookingId, organizationId, kind, render }: ShareLinkOptions): Promise<string> {
  const record = await db.bookings.get(bookingId)
  if (!record) throw new Error('booking not found')

  const path = shareFilePath(organizationId, bookingId, kind)
  const storedPath = kind === 'pdf' ? record.sharePdfPath : record.sharePngPath
  const fresh = storedPath === path && (record.shareRenderedAt ?? -1) >= record.updatedAt

  if (!fresh) {
    const blob = await render()
    await api.uploadShareFile(path, blob, CONTENT_TYPE[kind])
    // Remember the file against the content version it was rendered from;
    // `updatedAt` is left alone so this does not count as an edit.
    await db.bookings.update(bookingId, {
      ...(kind === 'pdf' ? { sharePdfPath: path } : { sharePngPath: path }),
      shareRenderedAt: record.updatedAt,
      dirty: 1,
    })
    emitBookingsChanged()
  }

  return api.signedUrl(path, SHARE_LINK_TTL_SECONDS)
}
