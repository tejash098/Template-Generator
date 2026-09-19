import { ArrowRight, FileDown, Languages, Link2, LogIn, Users, WifiOff, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { LanguageToggle } from '../../components/ui/LanguageToggle'
import { Logo } from '../../components/ui/Logo'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useAuth } from '../../cloud/useAuth'
import type { StringKey } from '../../i18n/strings'
import { useLocale } from '../../i18n/useLocale'
import { TEMPLATES } from '../../templates/registry'
import { SheetThumbnail } from '../editor/SheetThumbnail'

const FEATURES: { icon: LucideIcon; title: StringKey; desc: StringKey }[] = [
  { icon: WifiOff, title: 'landing.feature.offline.title', desc: 'landing.feature.offline.desc' },
  { icon: Languages, title: 'landing.feature.hindi.title', desc: 'landing.feature.hindi.desc' },
  { icon: FileDown, title: 'landing.feature.export.title', desc: 'landing.feature.export.desc' },
  { icon: Link2, title: 'landing.feature.share.title', desc: 'landing.feature.share.desc' },
  { icon: Users, title: 'landing.feature.team.title', desc: 'landing.feature.team.desc' },
]

const STEPS: StringKey[] = ['landing.how.step1', 'landing.how.step2', 'landing.how.step3']

/** Public front door at `/`: what the app does, with Sign in and Continue-without-account. */
export function LandingPage() {
  const { locale, t } = useLocale()
  const { status } = useAuth()
  const template = TEMPLATES['bus-booking']

  useEffect(() => {
    document.title = `${t('app.brand')} — ${t('app.title')}`
  }, [t])

  const cloud = status !== 'disabled'
  const signedIn = status === 'member'

  return (
    <div className={`page-gradient min-h-screen bg-page-bg text-text-primary ${TRANSITION.COLORS_SLOW}`}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${A11Y.FOCUS_RING}`}>
          <Logo size={34} />
          <span lang={locale} className="text-base font-semibold">
            {t('app.brand')}
          </span>
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle compact />
          <LanguageToggle compact />
          {cloud && !signedIn && (
            <Button to="/signin" size="sm" icon={<LogIn size={ICON_SIZE.SM} aria-hidden="true" />}>
              {t('nav.signIn')}
            </Button>
          )}
          {signedIn && (
            <Button to="/templates" size="sm" variant="primary">
              {t('app.title')}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 md:px-6">
        {/* Hero */}
        <section className="grid grid-cols-1 items-center gap-10 py-10 md:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <span className="inline-block rounded-full bg-accent-subtle px-3 py-1 text-xs font-medium text-accent">
              {t('landing.badge')}
            </span>
            <h1 className="mt-4 text-3xl leading-tight font-semibold sm:text-4xl lg:text-5xl">{t('landing.headline')}</h1>
            <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">{t('landing.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {cloud && !signedIn && (
                <Button to="/signin" variant="primary" icon={<LogIn size={ICON_SIZE.SM} aria-hidden="true" />}>
                  {t('landing.ctaSignIn')}
                </Button>
              )}
              <Button
                to="/templates"
                variant={cloud && !signedIn ? 'secondary' : 'primary'}
                icon={<ArrowRight size={ICON_SIZE.SM} aria-hidden="true" />}
              >
                {signedIn ? t('app.title') : t('landing.ctaOffline')}
              </Button>
            </div>
          </div>
          {/* Tilted at rest; straightens and comes forward on hover (lg:hover so it beats lg:rotate-1). */}
          <Link
            to={template.routes.start}
            aria-label={t('landing.hero.open')}
            className={`mx-auto block w-full min-w-0 max-w-md rounded-2xl border border-border bg-surface p-3 shadow-xl hover:scale-[1.03] hover:shadow-2xl lg:rotate-1 lg:hover:rotate-0 ${TRANSITION.TRANSFORM} ${A11Y.MOTION_SAFE} ${A11Y.FOCUS_RING}`}
          >
            <SheetThumbnail content={template.sampleContent(template.defaultPadColor)} themed />
          </Link>
        </section>

        {/* Features */}
        <section className="py-8 md:py-12">
          <h2 className="text-xl font-semibold">{t('landing.features')}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <Card key={title} className="flex gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
                  <Icon size={ICON_SIZE.MD} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{t(title)}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{t(desc)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-8 md:py-12">
          <h2 className="text-xl font-semibold">{t('landing.how')}</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {STEPS.map((key, i) => (
              <li key={key} className="flex gap-4 rounded-xl border border-border bg-surface p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <p className="text-sm text-text-primary">{t(key)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-sm text-text-secondary md:px-6">
        <span lang={locale}>{t('landing.footer')}</span>
      </footer>
    </div>
  )
}
