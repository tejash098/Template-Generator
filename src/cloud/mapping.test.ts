import { describe, expect, it } from 'vitest'
import type { BookingRecord } from '../storage/db'
import { fromRemote, toRemote } from './mapping'

const record: BookingRecord = {
  id: 'b1',
  seq: 12,
  bookingNo: '0012',
  template: 'bus-booking',
  bookingDate: '2026-09-17',
  name: 'प्रविन',
  place: 'बहेरा',
  from: 'डहला',
  to: 'नौहट्टा',
  travelDate: '2026-12-02',
  departureTime: '14:00',
  returnTime: '',
  fare: 12001,
  advance: 2101,
  mobile: '8709544189',
  bus: 'Star बस',
  padColor: 'orange',
  page: { size: 'a4', orientation: 'landscape' },
  createdAt: 1000,
  updatedAt: 2000,
  dirty: 1,
  deletedAt: 3000,
}

const ctx = { organizationId: 'org-1', userId: 'user-1', deviceId: 'dev-1' }

describe('mapping', () => {
  it('round-trips a record through the remote shape', () => {
    const remote = toRemote(record, ctx)
    expect(remote.from_place).toBe('डहला')
    expect(remote.to_place).toBe('नौहट्टा')
    expect(remote.client_updated_at).toBe(2000)
    expect(remote.deleted_at).toBe(new Date(3000).toISOString())
    expect(remote.created_by).toBe('user-1')
    expect(remote.updated_by).toBe('user-1')

    const back = fromRemote(
      { ...remote, created_at: new Date(1000).toISOString(), updated_at: new Date(5000).toISOString() } as never,
      record,
    )
    expect(back).toMatchObject({
      id: 'b1',
      seq: 12,
      bookingNo: '0012',
      from: 'डहला',
      to: 'नौहट्टा',
      padColor: 'orange',
      page: { size: 'a4', orientation: 'landscape' },
      updatedAt: 2000,
      deletedAt: 3000,
      dirty: 0,
      organizationId: 'org-1',
      createdBy: 'user-1',
      createdAt: 1000,
    })
  })

  it('keeps the original creator when a row is pushed by someone else', () => {
    expect(toRemote({ ...record, createdBy: 'staff-9' }, ctx).created_by).toBe('staff-9')
  })

  it('falls back to safe defaults for unknown remote values', () => {
    const remote = toRemote(record, ctx)
    const back = fromRemote({ ...remote, pad_color: 'pink', template: 'unknown', page: null, travel_date: null, created_at: 'x', updated_at: 'y' } as never)
    expect(back.padColor).toBe('navy')
    expect(back.template).toBe('bus-booking')
    expect(back.page).toEqual({ size: 'letter', orientation: 'portrait', customWidthMm: undefined, customHeightMm: undefined })
    expect(back.travelDate).toBe('')
  })
})
