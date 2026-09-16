import { amountToHindiWords } from './amountWords'
import { formatDateDdMmYyyy, formatRupees } from './format'
import { formatTimeHindi } from './hindiTime'

/*
 * The booking receipt as the operator writes it on the pad, e.g.
 *   मैं प्रविन कुमार दुबे ग्राम बहेरा का हूँ। दिनांक 02/12/2026 के शाम 2 बजे डहला से
 *   नौहट्टा जाना है। सुबह 6 बजे वापस होना है। किराया 12001/- (बारह हजार एक) तय है।
 *   बयाना 2101/- (दो हजार एक सौ एक) दिये। 9900/- बाकी।
 * Empty fields print as pen blanks so an incomplete receipt still reads sensibly.
 */

export const BLANK = '________'

export const blank = (value: string): string => value.trim() || BLANK

export interface BookingAmounts {
  fare: number
  advance: number
}

/** Balance is derived, never stored, and never negative. */
export const bookingBalance = ({ fare, advance }: BookingAmounts): number =>
  Math.max(0, (fare || 0) - (advance || 0))

export interface BookingProseInput extends BookingAmounts {
  name: string
  place: string
  from: string
  to: string
  /** ISO yyyy-mm-dd */
  travelDate: string
  /** HH:mm or '' */
  departureTime: string
  returnTime: string
}

export function buildBookingProse(c: BookingProseInput): string {
  const sentences: string[] = []
  sentences.push(`मैं ${blank(c.name)} ग्राम ${blank(c.place)} का हूँ।`)

  const date = c.travelDate ? formatDateDdMmYyyy(c.travelDate) : BLANK
  const departure = formatTimeHindi(c.departureTime) || BLANK
  sentences.push(`दिनांक ${date} के ${departure} ${blank(c.from)} से ${blank(c.to)} जाना है।`)

  const returnAt = formatTimeHindi(c.returnTime)
  if (returnAt) sentences.push(`${returnAt} वापस होना है।`)

  const fare = c.fare > 0 ? `${formatRupees(c.fare)} (${amountToHindiWords(c.fare)})` : BLANK
  sentences.push(`किराया ${fare} तय है।`)

  if (c.advance > 0) sentences.push(`बयाना ${formatRupees(c.advance)} (${amountToHindiWords(c.advance)}) दिये।`)

  if (c.fare > 0) {
    const balance = bookingBalance(c)
    sentences.push(balance > 0 ? `${formatRupees(balance)} बाकी।` : 'पूरा भुगतान हो गया।')
  }
  return sentences.join(' ')
}
