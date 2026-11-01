import type { CSSProperties } from 'react'
import { SIGNATURE_INKS, type SignatureMark as Mark } from './signature'
import { fontFamilyCss, signatureFont } from './signatureFonts'
import { strokeToPath } from './signaturePath'

interface SignatureMarkProps {
  mark: Mark
  className?: string
}

/** Stroke width of a drawn signature, in its 200-unit-high viewBox. */
const DRAWN_STROKE = 6

/**
 * Renders a signature the same way everywhere (sheet, library, picker). The
 * container sets the height; drawn and uploaded marks scale to it, typed marks
 * are sized by the container's font-size (scaled per style).
 */
export function SignatureMark({ mark, className = '' }: SignatureMarkProps) {
  if (mark.kind === 'typed') {
    const font = signatureFont(mark.font)
    const style: CSSProperties = {
      fontFamily: fontFamilyCss(font),
      fontWeight: font.weight,
      fontStyle: font.italic ? 'italic' : 'normal',
      fontSize: `${font.scale}em`,
      color: SIGNATURE_INKS[mark.ink],
    }
    return (
      <span className={`sig-mark sig-typed ${className}`} style={style}>
        {mark.text}
      </span>
    )
  }
  if (mark.kind === 'drawn') {
    return (
      <svg
        className={`sig-mark sig-drawn ${className}`}
        viewBox={`0 0 ${mark.width} ${mark.height}`}
        fill="none"
        stroke={SIGNATURE_INKS[mark.ink]}
        strokeWidth={DRAWN_STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
      >
        {mark.strokes.map((s, i) => (
          <path key={i} d={strokeToPath(s)} />
        ))}
      </svg>
    )
  }
  return <img className={`sig-mark sig-image ${className}`} src={mark.dataUrl} width={mark.width} height={mark.height} alt="" />
}
