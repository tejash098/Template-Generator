import type { ReactNode } from 'react'
import { FORM } from '../../config/constants'

interface FieldProps {
  id: string
  label: string
  hint?: string
  className?: string
  children: ReactNode
}

/** Label + control stack. The control must carry `id` so the label targets it. */
export function Field({ id, label, hint, className = '', children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={FORM.LABEL}>
        {label}
      </label>
      {children}
      {hint && <span className={FORM.HINT}>{hint}</span>}
    </div>
  )
}
