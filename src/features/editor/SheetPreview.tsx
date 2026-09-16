import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { LetterSheet, type LetterContent } from '../../document/LetterSheet'
import { mmToPx, pageDimensionsMm, type PageSpec } from '../../document/pageSizes'

interface SheetPreviewProps {
  content: LetterContent
  page: PageSpec
  onFitChange?: (scale: number) => void
  /** Receives the untransformed `.sheet` element for exporting. */
  sheetRef: RefObject<HTMLDivElement | null>
}

/**
 * Shows the sheet scaled down to fit its container. The scale lives on a
 * wrapper, never on the sheet itself, so exporters can capture it at 1:1.
 */
export function SheetPreview({ content, page, onFitChange, sheetRef }: SheetPreviewProps) {
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
      setScale(available > 0 ? Math.min(1, available / widthPx) : 1)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [widthPx])

  return (
    <div className="preview-host" ref={hostRef}>
      <div className="preview-scaler" style={{ width: widthPx * scale, height: heightPx * scale }}>
        <div className="preview-transform" style={{ transform: `scale(${scale})` }}>
          <LetterSheet ref={sheetRef} content={content} page={page} onFitChange={onFitChange} />
        </div>
      </div>
    </div>
  )
}
