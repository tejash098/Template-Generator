import { describe, expect, it } from 'vitest'
import { BLANK, bookingBalance, buildBookingProse } from './bookingText'

const sample = {
  name: 'तेजस कुमार सिंह',
  village: 'केखड़ा',
  post: '',
  thana: 'भभुआ',
  from: 'भभुआ',
  to: 'बिहार',
  travelDate: '2026-09-18',
  departureTime: '16:00',
  returnDate: '2026-09-19',
  returnTime: '06:00',
  fare: 10000,
  advance: 2000,
}

describe('buildBookingProse', () => {
  it('writes the receipt the way the owner fills the pad', () => {
    expect(buildBookingProse(sample)).toBe(
      'मैं तेजस कुमार सिंह ग्राम केखड़ा थाना भभुआ का रहने वाला हूँ। ' +
        'दिनांक 18/09/2026 के शाम 4 बजे भभुआ से बिहार जाना है। ' +
        'अगले दिन दिनांक 19/09/2026 सुबह 6 बजे वापस आना है। ' +
        'बस का किराया 10000/- (केवल दस हजार रुपये मात्र) तय है। ' +
        'बयाना 2000/- (केवल दो हजार रुपये मात्र) प्राप्त है। ' +
        'बाकी 8000/- (केवल आठ हजार रुपये मात्र)।',
    )
  })

  it('adds the post office only when it is given', () => {
    expect(buildBookingProse({ ...sample, post: 'रामगढ़' })).toContain('ग्राम केखड़ा पोस्ट रामगढ़ थाना भभुआ का')
    expect(buildBookingProse(sample)).not.toContain('पोस्ट')
  })

  it('says "अगले दिन" only when the return is the day after departure', () => {
    expect(buildBookingProse({ ...sample, returnDate: '2026-09-21' })).toContain(
      'जाना है। दिनांक 21/09/2026 सुबह 6 बजे वापस आना है।',
    )
    expect(buildBookingProse({ ...sample, returnDate: '2026-09-21' })).not.toContain('अगले दिन')
    expect(buildBookingProse({ ...sample, travelDate: '2026-12-31', returnDate: '2027-01-01' })).toContain(
      'अगले दिन दिनांक 01/01/2027',
    )
  })

  it('drops the return sentence without a return time, even if a date is set', () => {
    const text = buildBookingProse({ ...sample, returnTime: '' })
    expect(text).not.toContain('वापस')
    expect(text).not.toContain('19/09/2026')
  })

  it('omits बयाना when nothing was received and shows the whole fare as बाकी', () => {
    const text = buildBookingProse({ ...sample, advance: 0 })
    expect(text).not.toContain('बयाना')
    expect(text).toContain('बाकी 10000/- (केवल दस हजार रुपये मात्र)।')
  })

  it('says the fare is fully paid when nothing is left', () => {
    const text = buildBookingProse({ ...sample, advance: 10000 })
    expect(text).toContain('पूरा भुगतान प्राप्त है।')
    expect(text).not.toContain('बाकी')
  })

  it('prints blanks for empty fields so an incomplete receipt still reads', () => {
    const text = buildBookingProse({
      ...sample,
      name: '',
      village: '  ',
      post: '',
      thana: '',
      from: '',
      to: '',
      travelDate: '',
      departureTime: '',
      returnDate: '',
      returnTime: '',
      fare: 0,
      advance: 0,
    })
    expect(text).toBe(
      `मैं ${BLANK} ग्राम ${BLANK} थाना ${BLANK} का रहने वाला हूँ। ` +
        `दिनांक ${BLANK} के ${BLANK} ${BLANK} से ${BLANK} जाना है। ` +
        `बस का किराया ${BLANK} तय है।`,
    )
  })

  it('prints a blank return date when only the time is known', () => {
    expect(buildBookingProse({ ...sample, returnDate: '' })).toContain(`दिनांक ${BLANK} सुबह 6 बजे वापस आना है।`)
  })
})

describe('bookingBalance', () => {
  it('is fare minus advance and never negative', () => {
    expect(bookingBalance({ fare: 10000, advance: 2000 })).toBe(8000)
    expect(bookingBalance({ fare: 500, advance: 900 })).toBe(0)
    expect(bookingBalance({ fare: 0, advance: 0 })).toBe(0)
  })
})
