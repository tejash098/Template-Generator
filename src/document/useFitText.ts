import { useLayoutEffect, useState, type RefObject } from 'react'

export const FIT_MIN_SCALE = 0.35
/** Below this scale the letter is getting hard to read; the editor warns. */
export const FIT_WARN_SCALE = 0.8

/**
 * Shrinks the body text (via the `--body-scale` CSS variable on `contentRef`)
 * until `containerRef` no longer overflows. This implements the "always one
 * page" rule: long letters get smaller text instead of a second page.
 *
 * `fitKey` must change whenever anything that affects layout changes
 * (content, page size, orientation). Measurements use scrollHeight /
 * clientHeight, which ignore CSS transforms, so the preview can be scaled.
 */
export function useFitText(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  fitKey: string,
): number {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return
    let cancelled = false

    const apply = (s: number) => content.style.setProperty('--body-scale', String(s))
    const fits = (s: number) => {
      apply(s)
      return container.scrollHeight <= container.clientHeight
    }

    const fit = () => {
      let best = FIT_MIN_SCALE
      if (fits(1)) {
        best = 1
      } else {
        let lo = FIT_MIN_SCALE
        let hi = 1
        for (let i = 0; i < 10; i++) {
          const mid = (lo + hi) / 2
          if (fits(mid)) {
            best = mid
            lo = mid
          } else {
            hi = mid
          }
        }
      }
      apply(best)
      if (!cancelled) setScale(best)
    }

    fit()
    // Web fonts change metrics once they load; refit afterwards.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled) fit()
      })
    }
    return () => {
      cancelled = true
    }
  }, [containerRef, contentRef, fitKey])

  return scale
}
