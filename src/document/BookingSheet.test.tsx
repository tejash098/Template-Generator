import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BookingSheet, type BookingContent } from './BookingSheet'
import { BOOKING_TEXT } from './letterheadContent'
import { DEFAULT_PAGE } from './pageSizes'

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
