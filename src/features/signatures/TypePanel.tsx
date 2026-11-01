import { Field } from '../../components/ui/Field'
import { A11Y, FORM, TRANSITION } from '../../config/constants'
import { MAX_TYPED_LENGTH } from '../../document/signature'
import { fontFamilyCss, fontsForText, scriptOf, type SignatureFontId } from '../../document/signatureFonts'
import { useLocale } from '../../i18n/useLocale'
import { TransliterateInput } from '../../transliteration/TransliterateInput'
import { useTransliterationPref } from '../../transliteration/useTransliterationPref'

interface TypePanelProps {
  text: string
  onTextChange: (text: string) => void
  /** The chosen style; always one of `fontsForText(text)`. */
  font: SignatureFontId
  onFontChange: (font: SignatureFontId) => void
  color: string
}

/** Name input plus eight style tiles; the tiles follow the script being typed. */
export function TypePanel({ text, onTextChange, font, onFontChange, color }: TypePanelProps) {
  const { t } = useLocale()
  const [hindiTyping, setHindiTyping] = useTransliterationPref()
  const sample = text.trim() || t('signatures.namePlaceholder')
  const fonts = fontsForText(text)

  return (
    <div className="flex flex-col gap-3">
      <Field id="signature-name" label={t('signatures.name')}>
        <TransliterateInput
          id="signature-name"
          className={FORM.INPUT}
          enabled={hindiTyping}
          labels={{ suggestions: t('xlit.suggestions'), offline: t('xlit.offline') }}
          value={text}
          onChange={(value) => onTextChange(value.slice(0, MAX_TYPED_LENGTH))}
          placeholder={t('signatures.namePlaceholder')}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {t(scriptOf(text) === 'devanagari' ? 'signatures.styles.devanagari' : 'signatures.styles.latin')}
        </p>
        {/* Same preference as the editor: on, Roman letters become Devanagari. */}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" className="accent-accent" checked={hindiTyping} onChange={(e) => setHindiTyping(e.target.checked)} />
          {t('editor.hindiTyping')}
        </label>
      </div>
      <div role="radiogroup" aria-label={t('signatures.styles')} className="grid gap-2 sm:grid-cols-2">
        {fonts.map((f) => {
          const active = f.id === font
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={f.typed ? `${f.family} (${t('signatures.style.typed')})` : f.family}
              onClick={() => onFontChange(f.id as SignatureFontId)}
              className={`flex h-20 flex-col justify-between overflow-hidden rounded-lg bg-white px-3 py-2 text-left ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} ${
                active ? 'border-2 border-accent' : 'border border-border hover:border-accent'
              }`}
            >
              <span
                className="truncate leading-tight"
                style={{
                  fontFamily: fontFamilyCss(f),
                  fontWeight: f.weight,
                  fontStyle: f.italic ? 'italic' : 'normal',
                  fontSize: `${1.75 * f.scale}rem`,
                  color,
                }}
              >
                {sample}
              </span>
              <span className="text-[11px] text-stone-500">
                {f.family}
                {f.typed ? ` · ${t('signatures.style.typed')}` : ''}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
