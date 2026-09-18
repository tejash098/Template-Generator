import { Check } from 'lucide-react'
import { A11Y } from '../../config/constants'
import { PAD_COLORS, PAD_COLOR_IDS, type PadColorId } from '../../document/padColors'
import { useLocale } from '../../i18n/useLocale'

interface PadColorSwatchesProps {
  value: PadColorId
  onChange: (color: PadColorId) => void
  size?: 'sm' | 'lg'
}

/** Round colour swatches for the pad ink colour; the blank pad is a white disc. */
export function PadColorSwatches({ value, onChange, size = 'sm' }: PadColorSwatchesProps) {
  const { t } = useLocale()
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8'
  return (
    <div role="radiogroup" aria-label={t('padColor.label')} className="flex flex-wrap items-center gap-3">
      {PAD_COLOR_IDS.map((id) => {
        const active = id === value
        const label = t(`padColor.${id}`)
        const pad = PAD_COLORS[id]
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(id)}
            style={pad.preprinted ? { backgroundColor: '#fff', color: pad.hex } : { backgroundColor: pad.hex }}
            className={`flex items-center justify-center rounded-full shadow-sm ring-offset-2 ring-offset-surface transition-transform hover:scale-105 ${dim} ${
              pad.preprinted ? 'border border-border' : 'text-white'
            } ${active ? 'ring-2 ring-accent' : ''} ${A11Y.FOCUS_RING}`}
          >
            {active && <Check size={size === 'lg' ? 22 : 16} strokeWidth={3} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
