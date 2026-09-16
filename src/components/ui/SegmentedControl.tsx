import { A11Y, TRANSITION } from '../../config/constants'

interface SegmentedControlProps<T extends string> {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}

/** A radiogroup rendered as joined buttons (orientation, Form/Preview tabs). */
export function SegmentedControl<T extends string>({ value, options, onChange, label, className = '' }: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex overflow-hidden rounded-lg border border-border ${className}`}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-sm ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} not-first:border-l not-first:border-border ${
              active ? 'bg-accent-subtle font-medium text-accent' : 'bg-surface text-text-secondary hover:text-text-primary'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
