import { rupeesInWords } from './amountWords'
import { formatDateDdMmYyyy, formatRupees, nextDayIso } from './format'
import { formatTimeHindi } from './hindiTime'

/*
 * The booking receipt as the operator writes it on the pad, e.g.
 *   मैं तेजस कुमार सिंह ग्राम केखड़ा थाना भभुआ का रहने वाला हूँ। दिनांक 18/09/2026 के
 *   शाम 4 बजे भभुआ से बिहार जाना है। अगले दिन दिनांक 19/09/2026 सुबह 6 बजे वापस
 *   आना है। बस का किराया 10000/- (दस हजार रुपये मात्र) तय है। बयाना 2000/-
 *   (दो हजार रुपये मात्र) प्राप्त है। बाकी 8000/- (आठ हजार रुपये मात्र)।
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
  village: string
  post: string
  thana: string
  from: string
  to: string
  /** ISO yyyy-mm-dd */
  travelDate: string
  /** HH:mm or '' */
  departureTime: string
  /** ISO yyyy-mm-dd or '' */
  returnDate: string
  returnTime: string
}

const amount = (n: number): string => `${formatRupees(n)} (${rupeesInWords(n)})`

export function buildBookingProse(c: BookingProseInput): string {
  const sentences: string[] = []

  const post = c.post.trim() ? ` पोस्ट ${c.post.trim()}` : ''
  sentences.push(`मैं ${blank(c.name)} ग्राम ${blank(c.village)}${post} थाना ${blank(c.thana)} का रहने वाला हूँ।`)

  const date = c.travelDate ? formatDateDdMmYyyy(c.travelDate) : BLANK
  const departure = formatTimeHindi(c.departureTime) || BLANK
  sentences.push(`दिनांक ${date} के ${departure} ${blank(c.from)} से ${blank(c.to)} जाना है।`)

  const returnAt = formatTimeHindi(c.returnTime)
  if (returnAt) {
    const nextDay = c.returnDate && c.travelDate && c.returnDate === nextDayIso(c.travelDate) ? 'अगले दिन ' : ''
    const returnDate = c.returnDate ? formatDateDdMmYyyy(c.returnDate) : BLANK
    sentences.push(`${nextDay}दिनांक ${returnDate} ${returnAt} वापस आना है।`)
  }

  sentences.push(`बस का किराया ${c.fare > 0 ? amount(c.fare) : BLANK} तय है।`)

  if (c.advance > 0) sentences.push(`बयाना ${amount(c.advance)} प्राप्त है।`)

  if (c.fare > 0) {
    const balance = bookingBalance(c)
    sentences.push(balance > 0 ? `बाकी ${amount(balance)}।` : 'पूरा भुगतान प्राप्त है।')
  }
  return sentences.join(' ')
}
