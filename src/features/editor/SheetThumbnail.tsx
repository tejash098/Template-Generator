import type { BookingContent } from '../../document/BookingSheet'
import { DEFAULT_PAGE, type PageSpec } from '../../document/pageSizes'
import { SheetPreview } from './SheetPreview'

interface SheetThumbnailProps {
  content: BookingContent
  page?: PageSpec
  className?: string
  /**
   * Decorative use (landing page, gallery): follow the app theme, rendering
   * the paper dark in dark mode via a filter on this wrapper. The sheet itself
   * is never themed, so previews that must show real paper leave this off.
   */
  themed?: boolean
}

/**
 * A non-interactive, scaled-down rendering of the real sheet, used for the
 * gallery card and the pad-colour preview. It is the genuine document, so
 * what you see is exactly what will be generated.
 */
export function SheetThumbnail({ content, page = DEFAULT_PAGE, className = '', themed = false }: SheetThumbnailProps) {
  return (
    <div
      className={`pointer-events-none select-none ${themed ? 'dark:invert dark:hue-rotate-180' : ''} ${className}`}
      aria-hidden="true"
    >
      <SheetPreview content={content} page={page} />
    </div>
  )
}
