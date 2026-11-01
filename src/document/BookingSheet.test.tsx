import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BookingSheet, type BookingContent } from './BookingSheet'
import { formatDateDdMmYyyy } from './format'
import { BOOKING_TEXT } from './letterheadContent'
import { DEFAULT_PAGE } from './pageSizes'
import type { SignatureMark } from './signature'

const content: BookingContent = {
  bookingNo: '0001',
  bookingDate: '2026-11-10',
  issuedByName: 'सुनील',
  name: 'रमेश सिंह',
  village: 'अखलासपुर',
  post: 'भभुआ',
  thana: 'भभुआ',
  from: 'भभुआ',
  to: 'वाराणसी',
  travelDate: '2026-11-12',
  departureTime: '09:00',
  returnDate: '2026-11-13',
  returnTime: '18:00',
  fare: 25000,
  advance: 5000,
  mobile: '9876543210',
  mobile2: '',
  bus: '',
  padColor: 'navy',
}

describe('BookingSheet COPY watermark', () => {
  it('is absent on the original', () => {
    const { container } = render(<BookingSheet content={content} page={DEFAULT_PAGE} />)
    expect(container.querySelector('.sheet-watermark')).toBeNull()
  })

  it('stamps COPY between two rules, on coloured and blank pads alike', () => {
    for (const padColor of ['navy', 'blank'] as const) {
      const { container, unmount } = render(<BookingSheet content={{ ...content, padColor }} page={DEFAULT_PAGE} copyMark />)
      const mark = container.querySelector('.sheet > .sheet-watermark')
      expect(mark?.querySelector('.sheet-watermark-text')?.textContent).toBe(BOOKING_TEXT.copyWatermark)
      expect(mark?.querySelectorAll('.sheet-watermark-rule')).toHaveLength(2)
      unmount()
    }
  })
})

describe('BookingSheet issuer signature', () => {
  it('prints the staff name when there is no signature', () => {
    const { container } = render(<BookingSheet content={content} page={DEFAULT_PAGE} />)
    expect(container.querySelector('.lh-issuer-name')?.textContent).toBe('सुनील')
    expect(container.querySelector('.lh-issuer-sign')).toBeNull()
  })

  it('replaces the name with each kind of signature, under the booking date', () => {
    const marks: SignatureMark[] = [
      { kind: 'typed', text: 'Sunil Kumar', font: 'great-vibes', ink: 'blue' },
      { kind: 'drawn', width: 300, height: 200, strokes: [[6, 6, 80, 90, 150, 20]], ink: 'black' },
      { kind: 'image', dataUrl: 'data:image/png;base64,AAAA', width: 60, height: 20 },
    ]
    for (const signature of marks) {
      const { container, unmount } = render(<BookingSheet content={{ ...content, signature }} page={DEFAULT_PAGE} />)
      const issuer = container.querySelector('.lh-issuer')
      expect(issuer?.querySelector('.lh-issuer-name')).toBeNull()
      expect(issuer?.firstElementChild?.textContent).toBe(formatDateDdMmYyyy(content.bookingDate))
      expect(issuer?.querySelector(`.lh-issuer-sign .sig-${signature.kind}`)).not.toBeNull()
      unmount()
    }
  })
})

