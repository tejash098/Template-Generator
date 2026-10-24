import { A11Y, TRANSITION } from '../../config/constants'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Shown left of the track; the state when unchecked. */
  offLabel: string
  /** Shown right of the track; the state when checked. */
  onLabel: string
  /** Accessible name of the switch itself. */
  label: string
  className?: string
}

/**
 * A two-sided on/off switch: `offLabel ( ●) onLabel`, the current side in bold
 * (Original / Copy in the editor). Clicking either side label picks that side.
 */
export function Switch({ checked, onChange, offLabel, onLabel, label, className = '' }: SwitchProps) {
  const side = (active: boolean) =>
    `cursor-pointer select-none text-sm ${TRANSITION.COLORS} ${
      active ? 'font-medium text-text-primary' : 'text-text-secondary hover:text-text-primary'
    }`
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={side(!checked)} onClick={() => onChange(false)}>
        {offLabel}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        onClick={() => onChange(!checked)}
        className={`relative h-[22px] w-10 shrink-0 rounded-full ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} ${
          checked ? 'bg-accent' : 'bg-border'
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-[3px] left-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${A11Y.MOTION_SAFE} ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
      <span className={side(checked)} onClick={() => onChange(true)}>
        {onLabel}
      </span>
    </div>
  )
}
