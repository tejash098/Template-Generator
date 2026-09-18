import { useEffect, useRef, type CSSProperties, type Ref } from 'react'
import { LetterheadFooter, LetterheadHeader } from './Letterhead'
import { BOOKING_TEXT } from './letterheadContent'
import { buildBookingProse } from './bookingText'
import { formatDateDdMmYyyy } from './format'
import { PAD_COLORS, type PadColorId } from './padColors'
import { pageDimensionsMm, type PageSpec } from './pageSizes'
import { useFitText } from './useFitText'
import './sheet.css'

/** Everything that varies from booking to booking. */
export interface BookingContent {
  bookingNo: string
  /** ISO yyyy-mm-dd — when the booking was written; printed bottom-right above the staff name. */
  bookingDate: string
  /** Name of the signed-in staff member who issued it; '' when nobody was signed in. */
  issuedByName: string
  name: string
  village: string
  post: string
  thana: string
  from: string
  to: string
  /** ISO yyyy-mm-dd — the trip day; also the pad's top दिनांक. */
  travelDate: string
  /** HH:mm or '' */
  departureTime: string
  /** ISO yyyy-mm-dd or '' */
  returnDate: string
  returnTime: string
  fare: number
  advance: number
  mobile: string
  mobile2: string
  bus: string
  padColor: PadColorId
}

interface BookingSheetProps {
  content: BookingContent
  page: PageSpec
  /** Reports the body-text scale after fitting (1 = no shrink). */
  onFitChange?: (scale: number) => void
  ref?: Ref<HTMLDivElement>
}

const NBSP = ' '

/**
 * One finished page: the fixed letterhead (in the chosen pad colour) + the
 * booking written as prose + the customer's phones/bus line and signature on
 * the left, the booking date and issuing staff name on the right. On the
 * "blank" pad the letterhead artwork keeps its space but paints nothing, so the
 * same layout lands on a physical pre-printed pad. This element is what gets
 * previewed, printed and exported; it is sized in CSS mm and must never carry
 * a CSS transform (the preview scales a wrapper).
 */
export function BookingSheet({ content, page, onFitChange, ref }: BookingSheetProps) {
  const dims = pageDimensionsMm(page)
  const bodyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const fitKey = JSON.stringify([content, dims])
  const scale = useFitText(bodyRef, contentRef, fitKey)
  useEffect(() => {
    onFitChange?.(scale)
  }, [scale, onFitChange])

  const pad = PAD_COLORS[content.padColor]
  const style = {
    '--page-w': `${dims.widthMm}mm`,
    '--page-h': `${dims.heightMm}mm`,
    '--brand': pad.hex,
  } as CSSProperties

  const phones = [content.mobile, content.mobile2].map((m) => m.trim()).filter(Boolean)

  return (
    <div className={pad.preprinted ? 'sheet sheet-preprinted' : 'sheet'} style={style} ref={ref} lang="hi">
      <LetterheadHeader letterNo={content.bookingNo} date={formatDateDdMmYyyy(content.travelDate)} />

      <div className="lh-body" ref={bodyRef}>
        <div className="lh-content" ref={contentRef}>
          <p className="lh-prose">{buildBookingProse(content)}</p>

          <div className="lh-bottom">
            <div className="lh-party">
              <div className="lh-lines">
                <div>
                  {BOOKING_TEXT.mobilePrefix} {phones.length ? phones.join(', ') : '________'}
                </div>
                {content.bus.trim() && <div>{content.bus.trim()}</div>}
              </div>
              <div className="lh-signoff">
                <div className="lh-sign-space" aria-hidden="true" />
                <div className="lh-signatory">{content.name.trim() || NBSP}</div>
                <div className="lh-sign-label">{BOOKING_TEXT.customerSignatureLabel}</div>
              </div>
            </div>

            <div className="lh-party lh-party-right lh-issuer">
              <div>{formatDateDdMmYyyy(content.bookingDate)}</div>
              <div className="lh-issuer-name">{content.issuedByName.trim() || NBSP}</div>
            </div>
          </div>
        </div>
      </div>

      <LetterheadFooter />
    </div>
  )
}
