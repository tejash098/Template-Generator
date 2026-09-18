import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { LanguageToggle } from '../../components/ui/LanguageToggle'
import { Logo } from '../../components/ui/Logo'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { A11Y, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'

interface AuthLayoutProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Centered card used by the sign-in, reset and set-password pages (no sidebar). */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { locale, t } = useLocale()
  useEffect(() => {
    document.title = `${title} — Shri Ram Bus Service`
  }, [title])

  return (
    <div className={`page-gradient flex min-h-screen flex-col bg-page-bg ${TRANSITION.COLORS_SLOW}`}>
      <header className="flex items-center justify-between px-4 py-3 md:px-6">
        <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${A11Y.FOCUS_RING}`}>
          <Logo size={30} />
          <span lang={locale} className="text-sm font-semibold text-text-primary">
            {t('app.brand')}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <LanguageToggle compact />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-12">
        <Card className="w-full max-w-sm p-6">
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </Card>
      </main>
    </div>
  )
}
