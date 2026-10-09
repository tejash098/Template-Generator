import { createContext } from 'react'
import type { CalendarEvent, GoogleConnection } from './cloudApi'

export interface CalendarContextValue {
  /** A signed-in member in a cloud build: the only case where Google Calendar can work. */
  available: boolean
  /** True until the member's connection has been read once. */
  loading: boolean
  /** The member's own Google Calendar connection; null when not connected. */
  connection: GoogleConnection | null
  eventFor: (bookingId: string) => CalendarEvent | undefined
  /** A call for this booking is in flight. */
  isBusy: (bookingId: string) => boolean
  /** Sends the browser to Google's consent screen (comes back to /oauth/google). */
  connect: (returnTo?: string) => Promise<void>
  /** Finishes a connect from the callback's query; resolves to the route to go back to. */
  finishConnect: (params: URLSearchParams) => Promise<string>
  disconnect: () => Promise<void>
  /** Creates (or repairs) the booking's event. Rejects with CalendarCallError. */
  add: (bookingId: string) => Promise<void>
  remove: (bookingId: string) => Promise<void>
  reload: () => Promise<void>
}

export const CalendarContext = createContext<CalendarContextValue | null>(null)
