import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { CalendarContext, type CalendarContextValue } from '../../cloud/CalendarContext'
import type { CalendarEvent, GoogleConnection } from '../../cloud/cloudApi'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import type { BookingRecord } from '../../storage/db'
import { newBookingFields } from '../../storage/bookings'
import { CalendarButton } from './CalendarButton'

const booking = (patch: Partial<BookingRecord> = {}): BookingRecord => ({
  ...newBookingFields(),
  travelDate: '2026-10-20',
  id: 'b-1',
  seq: 7,
  bookingNo: '7',
  template: 'bus-booking',
  page: { size: 'letter', orientation: 'portrait' },
  createdAt: 0,
  updatedAt: 0,
  dirty: 0,
  syncedAt: 1,
  ...patch,
})

function calendar(connection: GoogleConnection | null, event?: CalendarEvent): CalendarContextValue {
  return {
    available: true,
    loading: false,
    connection,
    eventFor: () => event,
    isBusy: () => false,
    connect: vi.fn(),
    finishConnect: vi.fn(),
    disconnect: vi.fn(),
    add: vi.fn(async () => {}),
    remove: vi.fn(async () => {}),
    reload: vi.fn(),
  }
}

const connected: GoogleConnection = { status: 'connected', accountEmail: 'owner@gmail.test' }

function show(value: CalendarContextValue, record = booking()) {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <CalendarContext.Provider value={value}>
          <CalendarButton booking={record} />
        </CalendarContext.Provider>
      </LocaleProvider>
    </MemoryRouter>,
  )
}

describe('CalendarButton', () => {
  it('stays hidden until Google Calendar is connected', () => {
    const { container } = show(calendar(null))
    expect(container.innerHTML).toBe('')
  })

  it('stays hidden for a booking without a travel date', () => {
    const { container } = show(calendar(connected), booking({ travelDate: '' }))
    expect(container.innerHTML).toBe('')
  })

  it('asks before adding, then adds', () => {
    const value = calendar(connected)
    show(value)
    fireEvent.click(screen.getByRole('button', { name: 'Add to Google Calendar' }))
    expect(screen.getByText(/as an all-day event on 20\/10\/2026/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add to calendar' }))
    expect(value.add).toHaveBeenCalledWith('b-1')
  })

  it('offers open and remove once the booking is in the calendar', () => {
    const value = calendar(connected, { bookingId: 'b-1', status: 'added', htmlLink: 'https://calendar.test/e', error: null })
    show(value)
    fireEvent.click(screen.getByRole('button', { name: 'In Google Calendar' }))
    expect(screen.getByRole('button', { name: 'Open in Google Calendar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove from calendar' }))
    expect(value.remove).toHaveBeenCalledWith('b-1')
  })

  it('waits for a booking that has never synced', () => {
    show(calendar(connected), booking({ syncedAt: undefined }))
    expect((screen.getByRole('button', { name: 'Available once this booking has synced' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('links to Plugins when the connection needs a reconnect', () => {
    show(calendar({ status: 'needs_reauth', accountEmail: 'owner@gmail.test' }))
    expect(screen.getByRole('link', { name: 'Reconnect Google Calendar' }).getAttribute('href')).toBe('/plugins')
  })
})
