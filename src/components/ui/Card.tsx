import type { HTMLAttributes } from 'react'
import { TRANSITION } from '../../config/constants'

/** Surface container: white card on cream, near-black card in dark mode. */
export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 ${TRANSITION.COLORS_SLOW} ${className}`} {...rest}>
      {children}
    </div>
  )
}
