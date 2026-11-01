import { describe, expect, it } from 'vitest'
import type { BookingRecord, SignatureRecord } from '../storage/db'
import { fromRemote, signatureFromRemote, signatureToRemote, toRemote } from './mapping'

const record: BookingRecord = {
  id: 'b1',
  seq: 12,
  bookingNo: '0012',
  template: 'bus-booking',
  bookingDate: '2026-09-17',
  issuedByName: 'वशिष्ठ नारायण सिंह',
  name: 'प्रविन',
  village: 'बहेरा',
  post: 'रामगढ़',
  thana: 'दुर्गावती',
  from: 'डहला',
  to: 'नौहट्टा',
  travelDate: '2026-12-02',
  departureTime: '14:00',
  returnDate: '2026-12-03',
  returnTime: '',
  fare: 12001,
  advance: 2101,
  mobile: '8709544189',
  mobile2: '9431012345',
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
    expect(remote.village).toBe('बहेरा')
    expect(remote.post).toBe('रामगढ़')
    expect(remote.thana).toBe('दुर्गावती')
    expect(remote.return_date).toBe('2026-12-03')
    expect(remote.mobile2).toBe('9431012345')
    expect(remote.issued_by_name).toBe('वशिष्ठ नारायण सिंह')
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
      village: 'बहेरा',
      post: 'रामगढ़',
      thana: 'दुर्गावती',
      returnDate: '2026-12-03',
      mobile2: '9431012345',
      issuedByName: 'वशिष्ठ नारायण सिंह',
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
    const back = fromRemote({ ...remote, pad_color: 'pink', template: 'unknown', page: null, travel_date: null, return_date: null, created_at: 'x', updated_at: 'y' } as never)
    expect(back.padColor).toBe('navy')
    expect(back.template).toBe('bus-booking')
    expect(back.page).toEqual({ size: 'letter', orientation: 'portrait', customWidthMm: undefined, customHeightMm: undefined })
    expect(back.travelDate).toBe('')
    expect(back.returnDate).toBe('')
  })

  it('carries the signature snapshot both ways and drops a malformed one', () => {
    const signature = { kind: 'typed', text: 'Sunil', font: 'great-vibes', ink: 'blue' } as const
    const remote = toRemote({ ...record, signature }, ctx)
    expect(remote.signature).toEqual(signature)
    const row = { ...remote, created_at: new Date(1000).toISOString(), updated_at: new Date(5000).toISOString() } as never
    expect(fromRemote(row).signature).toEqual(signature)
    expect(toRemote(record, ctx).signature).toBeNull()
    const bad = { ...(row as object), signature: { kind: 'image', dataUrl: 'javascript:alert(1)', width: 1, height: 1 } } as never
    expect(fromRemote(bad).signature).toBeNull()
  })

  it('maps a library signature and skips one whose mark is invalid', () => {
    const sig: SignatureRecord = {
      id: 's1',
      label: 'Sunil',
      mark: { kind: 'typed', text: 'Sunil', font: 'kalam', ink: 'black' },
      createdAt: 1000,
      updatedAt: 2000,
      dirty: 1,
    }
    const remote = signatureToRemote(sig, ctx)
    expect(remote).toMatchObject({ id: 's1', organization_id: 'org-1', user_id: 'user-1', client_updated_at: 2000, deleted_at: null })
    const row = { ...remote, created_at: new Date(1000).toISOString(), updated_at: new Date(5000).toISOString() } as never
    expect(signatureFromRemote(row)).toMatchObject({ id: 's1', mark: sig.mark, dirty: 0, createdBy: 'user-1', organizationId: 'org-1' })
    expect(signatureFromRemote({ ...(row as object), mark: { kind: 'typed', text: 'x', font: 'nope', ink: 'blue' } } as never)).toBeNull()
  })
})
