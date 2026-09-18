import type { PadColorId } from '../document/padColors'
import { isPadColorId } from '../document/padColors'
import type { PageSpec } from '../document/pageSizes'
import type { BookingRecord } from '../storage/db'
import { isTemplateId } from '../templates/ids'
import type { RemoteBooking, RemoteBookingInsert } from './cloudApi'

/*
 * Local BookingRecord (camelCase, epoch ms) <-> Supabase bookings row
 * (snake_case, ISO timestamps). `client_updated_at` carries the device clock
 * that last-write-wins is decided on.
 */

export interface RemoteContext {
  organizationId: string
  userId: string
  deviceId: string
}

const isoDate = (value: string): string | null => (value ? value : null)

export function toRemote(record: BookingRecord, ctx: RemoteContext): RemoteBookingInsert {
  return {
    id: record.id,
    organization_id: record.organizationId ?? ctx.organizationId,
    template: record.template,
    seq: record.seq,
    booking_no: record.bookingNo,
    booking_date: record.bookingDate,
    name: record.name,
    village: record.village,
    post: record.post,
    thana: record.thana,
    from_place: record.from,
    to_place: record.to,
    travel_date: isoDate(record.travelDate),
    departure_time: record.departureTime,
    return_date: isoDate(record.returnDate),
    return_time: record.returnTime,
    fare: record.fare,
    advance: record.advance,
    mobile: record.mobile,
    mobile2: record.mobile2,
    bus: record.bus,
    issued_by_name: record.issuedByName,
    pad_color: record.padColor,
    page: record.page as unknown as RemoteBookingInsert['page'],
    created_by: record.createdBy ?? ctx.userId,
    updated_by: ctx.userId,
    device_id: ctx.deviceId,
    client_updated_at: record.updatedAt,
    deleted_at: record.deletedAt ? new Date(record.deletedAt).toISOString() : null,
    share_pdf_path: record.sharePdfPath ?? null,
    share_png_path: record.sharePngPath ?? null,
    share_rendered_at: record.shareRenderedAt ?? null,
  }
}

const asPage = (value: unknown): PageSpec => {
  const p = (value ?? {}) as Partial<PageSpec>
  return {
    size: p.size ?? 'letter',
    orientation: p.orientation === 'landscape' ? 'landscape' : 'portrait',
    customWidthMm: p.customWidthMm,
    customHeightMm: p.customHeightMm,
  }
}

/** A freshly pulled row is clean by definition. */
export function fromRemote(row: RemoteBooking, existing?: BookingRecord): BookingRecord {
  return {
    id: row.id,
    seq: row.seq,
    bookingNo: row.booking_no,
    template: isTemplateId(row.template) ? row.template : 'bus-booking',
    bookingDate: row.booking_date,
    name: row.name,
    village: row.village,
    post: row.post,
    thana: row.thana,
    from: row.from_place,
    to: row.to_place,
    travelDate: row.travel_date ?? '',
    departureTime: row.departure_time,
    returnDate: row.return_date ?? '',
    returnTime: row.return_time,
    fare: row.fare,
    advance: row.advance,
    mobile: row.mobile,
    mobile2: row.mobile2,
    bus: row.bus,
    issuedByName: row.issued_by_name,
    padColor: isPadColorId(row.pad_color) ? row.pad_color : ('navy' as PadColorId),
    page: asPage(row.page),
    createdAt: existing?.createdAt ?? Date.parse(row.created_at),
    updatedAt: row.client_updated_at,
    dirty: 0,
    deletedAt: row.deleted_at ? Date.parse(row.deleted_at) : undefined,
    syncedAt: Date.now(),
    organizationId: row.organization_id,
    createdBy: row.created_by,
    sharePdfPath: row.share_pdf_path ?? undefined,
    sharePngPath: row.share_png_path ?? undefined,
    shareRenderedAt: row.share_rendered_at ?? undefined,
  }
}
