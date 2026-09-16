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
  /** ISO yyyy-mm-dd — the pad's top दिनांक. */
  bookingDate: string
  /** ISO yyyy-mm-dd — when the receipt was generated (printed at the bottom). */
  issuedDate: string
  name: string
  place: string
  from: string
  to: string
  /** ISO yyyy-mm-dd */
  travelDate: string
  /** HH:mm or '' */
  departureTime: string
  returnTime: string
  fare: number
  advance: number
  mobile: string
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

/**
 * One finished page: the fixed letterhead (in the chosen pad colour) + the
 * booking written as prose, mobile/bus lines, and the signature block. This
 * element is what gets previewed, printed and exported; it is sized in CSS mm
 * and must never carry a CSS transform (the preview scales a wrapper).
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

  const style = {
    '--page-w': `${dims.widthMm}mm`,
    '--page-h': `${dims.heightMm}mm`,
    '--brand': PAD_COLORS[content.padColor].hex,
  } as CSSProperties

  return (
    <div className="sheet" style={style} ref={ref} lang="hi">
      <LetterheadHeader letterNo={content.bookingNo} date={formatDateDdMmYyyy(content.bookingDate)} />

      <div className="lh-body" ref={bodyRef}>
        <div className="lh-content" ref={contentRef}>
          <p className="lh-prose">{buildBookingProse(content)}</p>

          <div className="lh-lines">
            <div>
              {BOOKING_TEXT.mobilePrefix} {content.mobile.trim() || '________'}
            </div>
            {content.bus.trim() && <div>{content.bus.trim()}</div>}
          </div>

          <div className="lh-bottom">
            <div className="lh-issued">
              {BOOKING_TEXT.issuedLabel} {formatDateDdMmYyyy(content.issuedDate)}
            </div>
            <div className="lh-signoff">
              <div className="lh-sign-space" aria-hidden="true" />
              <div className="lh-signatory">{content.name.trim() || ' '}</div>
              <div className="lh-sign-label">{BOOKING_TEXT.signatureLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <LetterheadFooter />
    </div>
  )
}
