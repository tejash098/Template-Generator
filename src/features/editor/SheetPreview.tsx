import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { BookingSheet, type BookingContent } from '../../document/BookingSheet'
import { mmToPx, pageDimensionsMm, type PageSpec } from '../../document/pageSizes'

interface SheetPreviewProps {
  content: BookingContent
  page: PageSpec
  onFitChange?: (scale: number) => void
  /** Receives the untransformed `.sheet` element for exporting. */
  sheetRef?: RefObject<HTMLDivElement | null>
  /** Cap the preview scale (e.g. for thumbnails); defaults to 1 = never upscale. */
  maxScale?: number
}

/**
 * Shows the sheet scaled down to fit its container. The scale lives on a
 * wrapper (`.preview-transform`), never on the sheet itself, so exporters can
 * capture it at 1:1. The class hooks are used by styles/print.css.
 */
export function SheetPreview({ content, page, onFitChange, sheetRef, maxScale = 1 }: SheetPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const dims = pageDimensionsMm(page)
  const widthPx = mmToPx(dims.widthMm)
  const heightPx = mmToPx(dims.heightMm)

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const update = () => {
      const available = host.clientWidth
      setScale(available > 0 ? Math.min(maxScale, available / widthPx) : 1)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [widthPx, maxScale])

  // contain-inline-size: the scaler's explicit width must never count as this
  // host's min-content, or a grid/flex parent could not shrink below the last
  // measured size (the preview would lock a phone layout at desktop width).
  return (
    <div className="preview-host w-full min-w-0 contain-inline-size" ref={hostRef}>
      <div
        className="preview-scaler mx-auto overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.18)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
        style={{ width: widthPx * scale, height: heightPx * scale }}
      >
        <div className="preview-transform origin-top-left" style={{ transform: `scale(${scale})` }}>
          <BookingSheet ref={sheetRef} content={content} page={page} onFitChange={onFitChange} />
        </div>
      </div>
    </div>
  )
}
