import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { pick } from '../../i18n/translate'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import { TEMPLATE_LIST } from '../../templates/registry'
import { SheetThumbnail } from '../editor/SheetThumbnail'

/** Home page: pick the document type to generate. */
export function TemplateGallery() {
  const { locale, t } = useLocale()

  return (
    <PageLayout title={t('gallery.title')} subtitle={t('gallery.subtitle')}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATE_LIST.map((tpl) => (
          <Link
            key={tpl.id}
            to={tpl.routes.start}
            className={`group block rounded-xl ${A11Y.FOCUS_RING}`}
            aria-label={`${pick(tpl.name, locale)} — ${t('gallery.use')}`}
          >
            <Card className={`flex h-full flex-col gap-4 p-4 hover:border-accent ${TRANSITION.COLORS}`}>
              <div className="overflow-hidden rounded-lg bg-page-bg p-3">
                <SheetThumbnail content={tpl.sampleContent(tpl.defaultPadColor)} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="text-base font-semibold text-text-primary">
                  {pick(tpl.name, locale)}
                  {locale === 'en' && (
                    <span lang="hi" className="ml-2 font-hindi text-sm font-normal text-text-secondary">
                      {tpl.name.hi}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-text-secondary">{pick(tpl.description, locale)}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                {t('gallery.use')}
                <ArrowRight size={ICON_SIZE.SM} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </Card>
          </Link>
        ))}
      </div>
      <p className="mt-6 text-xs text-text-secondary">{t('gallery.more')}</p>
    </PageLayout>
  )
}
