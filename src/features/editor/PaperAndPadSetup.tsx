import { Field } from '../../components/ui/Field'
import { PadColorSwatches } from '../../components/ui/PadColorSwatches'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { FORM } from '../../config/constants'
import type { PadColorId } from '../../document/padColors'
import {
  CUSTOM_MAX_MM,
  CUSTOM_MIN_MM,
  PAGE_SIZES,
  PAGE_SIZE_OPTIONS,
  type Orientation,
  type PageSizeId,
  type PageSpec,
} from '../../document/pageSizes'
import { useLocale } from '../../i18n/useLocale'

interface PaperAndPadSetupProps {
  page: PageSpec
  padColor: PadColorId
  onPageChange: (page: PageSpec) => void
  onPadColorChange: (color: PadColorId) => void
}

/** Paper size / orientation / custom dimensions, plus the pad ink colour. */
export function PaperAndPadSetup({ page, padColor, onPageChange, onPadColorChange }: PaperAndPadSetupProps) {
  const { t } = useLocale()

  const setSize = (size: PageSizeId) => {
    if (size === 'custom') {
      const base = page.size === 'custom' ? null : PAGE_SIZES[page.size]
      onPageChange({
        ...page,
        size,
        customWidthMm: page.customWidthMm ?? base?.widthMm ?? PAGE_SIZES.letter.widthMm,
        customHeightMm: page.customHeightMm ?? base?.heightMm ?? PAGE_SIZES.letter.heightMm,
      })
    } else {
      onPageChange({ ...page, size })
    }
  }

  const setCustom = (key: 'customWidthMm' | 'customHeightMm', raw: string) => {
    const value = Number(raw)
    onPageChange({ ...page, [key]: Number.isFinite(value) ? value : undefined })
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border px-3 pt-1 pb-3">
      <legend className={`px-1.5 ${FORM.LABEL}`}>{t('paper.legend')}</legend>

      <div className="flex flex-wrap gap-3">
        <Field id="paper-size" label={t('paper.size')} className="flex-1 basis-40">
          <select id="paper-size" className={FORM.INPUT} value={page.size} onChange={(e) => setSize(e.target.value as PageSizeId)}>
            {PAGE_SIZE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.id === 'custom' ? t('paper.custom') : o.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-1">
          <span className={FORM.LABEL}>{t('paper.orientation')}</span>
          <SegmentedControl<Orientation>
            label={t('paper.orientation')}
            value={page.orientation}
            onChange={(orientation) => onPageChange({ ...page, orientation })}
            options={[
              { value: 'portrait', label: t('paper.portrait') },
              { value: 'landscape', label: t('paper.landscape') },
            ]}
          />
        </div>
      </div>

      {page.size === 'custom' && (
        <div className="flex flex-wrap gap-3">
          <Field id="paper-width" label={t('paper.width')} className="flex-1 basis-32">
            <input
              id="paper-width"
              type="number"
              className={FORM.INPUT}
              min={CUSTOM_MIN_MM}
              max={CUSTOM_MAX_MM}
              step="0.1"
              value={page.customWidthMm ?? ''}
              onChange={(e) => setCustom('customWidthMm', e.target.value)}
            />
          </Field>
          <Field id="paper-height" label={t('paper.height')} className="flex-1 basis-32">
            <input
              id="paper-height"
              type="number"
              className={FORM.INPUT}
              min={CUSTOM_MIN_MM}
              max={CUSTOM_MAX_MM}
              step="0.1"
              value={page.customHeightMm ?? ''}
              onChange={(e) => setCustom('customHeightMm', e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className={FORM.LABEL}>{t('padColor.label')}</span>
        <PadColorSwatches value={padColor} onChange={onPadColorChange} />
      </div>
    </fieldset>
  )
}
