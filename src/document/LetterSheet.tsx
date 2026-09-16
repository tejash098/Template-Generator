import { useEffect, useRef, type CSSProperties, type Ref } from 'react'
import { LetterheadFooter, LetterheadHeader } from './Letterhead'
import { LETTERHEAD } from './letterheadContent'
import { formatDateDdMmYyyy } from './format'
import { pageDimensionsMm, type PageSpec } from './pageSizes'
import { useFitText } from './useFitText'
import './sheet.css'

/** Everything that varies from letter to letter. Provisional field set. */
export interface LetterContent {
  letterNo: string
  /** ISO yyyy-mm-dd */
  date: string
  recipient: string
  subject: string
  body: string
  closing: string
  signatoryName: string
  signatoryTitle: string
}

interface LetterSheetProps {
  content: LetterContent
  page: PageSpec
  /** Reports the body-text scale after fitting (1 = no shrink). */
  onFitChange?: (scale: number) => void
  ref?: Ref<HTMLDivElement>
}

/**
 * One finished page: fixed letterhead + the letter content, sized exactly to
 * the chosen paper in CSS mm. This is the single source of truth for what gets
 * previewed, printed and exported — every output path renders this element.
 *
 * The `.sheet` element must never carry a CSS transform itself; the preview
 * scales a wrapper instead so exporters can capture the sheet at 1:1.
 */
export function LetterSheet({ content, page, onFitChange, ref }: LetterSheetProps) {
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
  } as CSSProperties

  return (
    <div className="sheet" style={style} ref={ref} lang="hi">
      <LetterheadHeader letterNo={content.letterNo} date={formatDateDdMmYyyy(content.date)} />

      <div className="lh-body" ref={bodyRef}>
        <div className="lh-content" ref={contentRef}>
          <div className="lh-recipient">
            <div>{LETTERHEAD.recipientLabel}</div>
            <div className="lh-prewrap">{content.recipient}</div>
          </div>

          {content.subject && (
            <div className="lh-subject">
              <span className="lh-subject-label">{LETTERHEAD.subjectLabel}</span>{' '}
              <span className="lh-prewrap">{content.subject}</span>
            </div>
          )}

          <div className="lh-text lh-prewrap">{content.body}</div>

          <div className="lh-signoff">
            <div>{content.closing}</div>
            <div className="lh-sign-space" aria-hidden="true" />
            <div className="lh-signatory">{content.signatoryName}</div>
            <div>{content.signatoryTitle}</div>
          </div>
        </div>
      </div>

      <LetterheadFooter />
    </div>
  )
}
