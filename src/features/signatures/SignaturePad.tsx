import { Eraser, Undo2 } from 'lucide-react'
import { useEffect, useRef, type PointerEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ICON_SIZE } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'

interface SignaturePadProps {
  /** Finished strokes, flat [x, y, …] in the pad's CSS pixels. */
  strokes: number[][]
  onChange: (strokes: number[][]) => void
  color: string
}

const LINE_WIDTH = 2.6

function drawStroke(ctx: CanvasRenderingContext2D, s: number[]) {
  if (s.length < 2) return
  ctx.beginPath()
  ctx.moveTo(s[0], s[1])
  if (s.length === 2) ctx.lineTo(s[0] + 0.01, s[1])
  for (let i = 2; i < s.length; i += 2) ctx.lineTo(s[i], s[i + 1])
  ctx.stroke()
}

/**
 * A canvas to sign on with a mouse, finger or pen (pointer events, so touch
 * does not scroll the page). It only collects points; normalising and
 * smoothing happen on save (document/signaturePath.ts).
 */
export function SignaturePad({ strokes, onChange, color }: SignaturePadProps) {
  const { t } = useLocale()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentRef = useRef<number[] | null>(null)

  // Size the backing store to the element (and devicePixelRatio) and repaint
  // the finished strokes whenever they, the colour or the size change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const paint = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineWidth = LINE_WIDTH
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = color
      for (const s of strokes) drawStroke(ctx, s)
    }
    paint()
    const observer = new ResizeObserver(paint)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [strokes, color])

  const point = (e: PointerEvent<HTMLCanvasElement>): [number, number] => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [Math.round((e.clientX - rect.left) * 10) / 10, Math.round((e.clientY - rect.top) * 10) / 10]
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    try {
      // Keeps the stroke going when the pen leaves the canvas; best effort.
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not every webview supports capture for every pointer; drawing still works.
    }
    currentRef.current = point(e)
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const current = currentRef.current
    if (!current) return
    const [x, y] = point(e)
    const next = [...current, x, y]
    currentRef.current = next
    const ctx = e.currentTarget.getContext('2d')
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(current[current.length - 2], current[current.length - 1])
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const finish = () => {
    const current = currentRef.current
    currentRef.current = null
    if (current) onChange([...strokes, current])
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        aria-label={t('signatures.draw.label')}
        className="aspect-[3/1] w-full cursor-crosshair touch-none rounded-lg border border-dashed border-border bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onChange(strokes.slice(0, -1))} disabled={!strokes.length} icon={<Undo2 size={ICON_SIZE.SM} aria-hidden="true" />}>
          {t('signatures.undo')}
        </Button>
        <Button size="sm" onClick={() => onChange([])} disabled={!strokes.length} icon={<Eraser size={ICON_SIZE.SM} aria-hidden="true" />}>
          {t('signatures.clear')}
        </Button>
        <span className="text-xs text-text-secondary">{t('signatures.draw.hint')}</span>
      </div>
    </div>
  )
}
