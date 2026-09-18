import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { PadColorSwatches } from '../../components/ui/PadColorSwatches'
import { ICON_SIZE } from '../../config/constants'
import type { PadColorId } from '../../document/padColors'
import { pick } from '../../i18n/translate'
import { useLocale } from '../../i18n/useLocale'
import { PageLayout } from '../../layouts/PageLayout'
import { TEMPLATES, isTemplateId } from '../../templates/registry'
import { SheetThumbnail } from '../editor/SheetThumbnail'

/** Step between the gallery and the editor: choose the pad ink colour. */
export function TemplateStart() {
  const { templateId } = useParams<{ templateId: string }>()
  const navigate = useNavigate()
  const { locale, t } = useLocale()

  const tpl = isTemplateId(templateId) ? TEMPLATES[templateId] : null
  const [color, setColor] = useState<PadColorId>(tpl?.defaultPadColor ?? 'navy')

  if (!tpl) return <Navigate to="/templates" replace />

  return (
    <PageLayout
      title={t('start.title')}
      subtitle={t('start.subtitle')}
      documentTitle={pick(tpl.name, locale)}
      actions={
        <Button to="/templates" icon={<ArrowLeft size={ICON_SIZE.SM} aria-hidden="true" />}>
          {t('start.back')}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="flex flex-col gap-5">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{pick(tpl.name, locale)}</h2>
            <p className="mt-1 text-sm text-text-secondary">{pick(tpl.description, locale)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-text-secondary">{t('padColor.label')}</span>
            <PadColorSwatches value={color} onChange={setColor} size="lg" />
            <span className="text-sm text-text-primary">{t(`padColor.${color}`)}</span>
          </div>
          <div>
            <Button
              variant="primary"
              onClick={() => navigate(tpl.routes.newWith(color))}
              icon={<ArrowRight size={ICON_SIZE.SM} aria-hidden="true" />}
            >
              {t('start.start')}
            </Button>
          </div>
        </Card>

        <div className="rounded-xl border border-border bg-page-bg p-4">
          <SheetThumbnail content={tpl.sampleContent(color)} />
        </div>
      </div>
    </PageLayout>
  )
}
