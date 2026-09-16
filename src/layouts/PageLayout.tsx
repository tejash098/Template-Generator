import { useEffect, type ReactNode } from 'react'
import { CONTAINER } from '../config/constants'

interface PageLayoutProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  /** Browser tab title; defaults to `title`. */
  documentTitle?: string
  className?: string
  children: ReactNode
}

/** Page header (title, subtitle, actions) + content column; sets document.title. */
export function PageLayout({ title, subtitle, actions, documentTitle, className = '', children }: PageLayoutProps) {
  useEffect(() => {
    document.title = `${documentTitle ?? title} — Shri Ram Bus Service`
  }, [title, documentTitle])

  return (
    <div className={`${CONTAINER.MAX_W} flex w-full flex-1 flex-col ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}
