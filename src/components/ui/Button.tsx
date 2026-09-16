import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { A11Y, TRANSITION } from '../../config/constants'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: Variant
  size?: Size
  /** Renders a router link styled as a button. */
  to?: string
  icon?: ReactNode
  className?: string
}

const BASE = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium disabled:cursor-default disabled:opacity-60 ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  secondary: 'border border-border bg-surface text-text-primary hover:bg-accent-subtle hover:text-accent',
  danger: 'border border-border bg-surface text-danger hover:bg-danger-subtle',
  ghost: 'text-text-secondary hover:bg-accent-subtle hover:text-accent',
}

const SIZES: Record<Size, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3 py-2 text-sm',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  to,
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`
  if (to) {
    return (
      <Link to={to} className={classes}>
        {icon}
        {children}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  )
}
