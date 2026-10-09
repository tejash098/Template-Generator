// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  BOOKING_PROPERTY,
  bookingEventBody,
  contentHash,
  ddmmyyyy,
  eventDescription,
  eventSummary,
  nextDay,
  type BookingForEvent,
} from './bookingEvent'

const APP = 'https://template-generator-ruby.vercel.app/'

const booking = (patch: Partial<BookingForEvent> = {}): BookingForEvent => ({
  id: '11111111-2222-3333-4444-555555555555',
  booking_no: '123',
  name: 'रामेश्वर सिंह',
  village: 'केखड़ा',
  post: '',
  thana: 'भभुआ',
  from_place: 'भभुआ',
  to_place: 'वाराणसी',
  travel_date: '2026-10-20',
  departure_time: '08:30',
  return_date: '2026-10-21',
  return_time: '18:00',
  fare: 12000,
  advance: 2000,
  mobile: '9876543210',
  mobile2: '',
  bus: 'BR45 1234',
  issued_by_name: 'तेजस',
  ...patch,
})

describe('dates', () => {
  it('formats dd/mm/yyyy and steps to the next day across month and year ends', () => {
    expect(ddmmyyyy('2026-10-20')).toBe('20/10/2026')
    expect(nextDay('2026-10-20')).toBe('2026-10-21')
    expect(nextDay('2026-10-31')).toBe('2026-11-01')
    expect(nextDay('2026-12-31')).toBe('2027-01-01')
    expect(nextDay('2028-02-28')).toBe('2028-02-29')
  })
})

describe('eventSummary', () => {
  it('leads with the departure time, then route and name', () => {
    expect(eventSummary(booking())).toBe('08:30 · भभुआ → वाराणसी · रामेश्वर सिंह')
  })

  it('drops empty parts and falls back to the booking number', () => {
    expect(eventSummary(booking({ departure_time: '' }))).toBe('भभुआ → वाराणसी · रामेश्वर सिंह')
    expect(eventSummary(booking({ to_place: '' }))).toBe('08:30 · भभुआ → … · रामेश्वर सिंह')
    expect(eventSummary(booking({ departure_time: '', from_place: '', to_place: '', name: ' ' }))).toBe('पत्रांक 123')
  })
})

describe('eventDescription', () => {
  it('lists the booking in Hindi with a link back to the app', () => {
    expect(eventDescription(booking(), APP).split('\n')).toEqual([
      'पत्रांक: 123',
      'यात्री: रामेश्वर सिंह',
      'पता: ग्राम केखड़ा, थाना भभुआ',
      'यात्रा: भभुआ → वाराणसी',
      'प्रस्थान: 20/10/2026 08:30',
      'वापसी: 21/10/2026 18:00',
      'बस: BR45 1234',
      'मोबाइल: 9876543210',
      'किराया 12000/- · बयाना 2000/- · बाकी 10000/-',
      'जारीकर्ता: तेजस',
      '',
      'ऐप में खोलें: https://template-generator-ruby.vercel.app/#/bookings/11111111-2222-3333-4444-555555555555',
    ])
  })

  it('leaves out empty lines', () => {
    const lines = eventDescription(
      booking({ return_date: null, return_time: '', bus: '', fare: 0, issued_by_name: '', mobile: '' }),
      APP,
    ).split('\n')
    expect(lines.some((l) => l.startsWith('वापसी'))).toBe(false)
    expect(lines.some((l) => l.startsWith('बस'))).toBe(false)
    expect(lines.some((l) => l.startsWith('किराया'))).toBe(false)
    expect(lines.some((l) => l.startsWith('मोबाइल'))).toBe(false)
    expect(lines.some((l) => l.startsWith('जारीकर्ता'))).toBe(false)
  })
})

describe('bookingEventBody', () => {
  it('is an all-day event on the travel date, tagged with the booking id', () => {
    const body = bookingEventBody(booking(), APP)
    expect(body.start).toEqual({ date: '2026-10-20' })
    expect(body.end).toEqual({ date: '2026-10-21' })
    expect(body.location).toBe('भभुआ')
    expect(body.transparency).toBe('transparent')
    expect(body.reminders.overrides.map((r) => r.minutes)).toEqual([9540, 900])
    expect(body.extendedProperties.private[BOOKING_PROPERTY]).toBe(booking().id)
  })

  it('needs a travel date', () => {
    expect(() => bookingEventBody(booking({ travel_date: null }), APP)).toThrow()
  })
})

describe('contentHash', () => {
  it('is stable for the same booking and changes when a field changes', async () => {
    const a = await contentHash(bookingEventBody(booking(), APP))
    const b = await contentHash(bookingEventBody(booking(), APP))
    const c = await contentHash(bookingEventBody(booking({ departure_time: '09:00' }), APP))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(b).toBe(a)
    expect(c).not.toBe(a)
  })
})
