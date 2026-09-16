import { describe, expect, it } from 'vitest'
import { BLANK, bookingBalance, buildBookingProse } from './bookingText'

const sample = {
  name: 'प्रविन कुमार दुबे',
  place: 'बहेरा',
  from: 'डहला (दुर्गावती)',
  to: 'नौहट्टा',
  travelDate: '2026-12-02',
  departureTime: '14:00',
  returnTime: '06:00',
  fare: 12001,
  advance: 2101,
}

describe('buildBookingProse', () => {
  it('writes the receipt the way the pad samples read', () => {
    expect(buildBookingProse(sample)).toBe(
      'मैं प्रविन कुमार दुबे ग्राम बहेरा का हूँ। ' +
        'दिनांक 02/12/2026 के शाम 2 बजे डहला (दुर्गावती) से नौहट्टा जाना है। ' +
        'सुबह 6 बजे वापस होना है। ' +
        'किराया 12001/- (बारह हजार एक) तय है। ' +
        'बयाना 2101/- (दो हजार एक सौ एक) दिये। ' +
        '9900/- बाकी।',
    )
  })

  it('omits the optional return and advance sentences', () => {
    const text = buildBookingProse({ ...sample, returnTime: '', advance: 0 })
    expect(text).not.toContain('वापस')
    expect(text).not.toContain('बयाना')
    expect(text).toContain('12001/- बाकी।')
  })

  it('prints blanks for empty fields so an incomplete receipt still reads', () => {
    const text = buildBookingProse({ ...sample, name: '', place: '  ', from: '', to: '', travelDate: '', departureTime: '', returnTime: '', fare: 0, advance: 0 })
    expect(text).toBe(
      `मैं ${BLANK} ग्राम ${BLANK} का हूँ। दिनांक ${BLANK} के ${BLANK} ${BLANK} से ${BLANK} जाना है। किराया ${BLANK} तय है।`,
    )
  })

  it('says the fare is fully paid when nothing is left', () => {
    expect(buildBookingProse({ ...sample, advance: 12001 })).toContain('पूरा भुगतान हो गया।')
    expect(buildBookingProse({ ...sample, advance: 12001 })).not.toContain('बाकी')
  })
})

describe('bookingBalance', () => {
  it('is fare minus advance and never negative', () => {
    expect(bookingBalance({ fare: 12001, advance: 2101 })).toBe(9900)
    expect(bookingBalance({ fare: 500, advance: 900 })).toBe(0)
    expect(bookingBalance({ fare: 0, advance: 0 })).toBe(0)
  })
})
