import type { BookingContent } from '../../document/BookingSheet'
import { DEFAULT_PAGE, type PageSpec } from '../../document/pageSizes'
import { SheetPreview } from './SheetPreview'

interface SheetThumbnailProps {
  content: BookingContent
  page?: PageSpec
  className?: string
}

/**
 * A non-interactive, scaled-down rendering of the real sheet, used for the
 * gallery card and the pad-colour preview. It is the genuine document, so
 * what you see is exactly what will be generated.
 */
export function SheetThumbnail({ content, page = DEFAULT_PAGE, className = '' }: SheetThumbnailProps) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      <SheetPreview content={content} page={page} />
    </div>
  )
}
