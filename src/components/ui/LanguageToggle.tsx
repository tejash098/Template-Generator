import { Languages } from 'lucide-react'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'

/** Switches the UI language; the label names the language you will switch TO. */
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { toggle, t } = useLocale()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t('lang.switchTitle')}
      title={t('lang.switchTitle')}
      className={`flex items-center gap-2 rounded-lg p-2 text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
    >
      <Languages size={ICON_SIZE.MD} aria-hidden="true" />
      {!compact && <span className="text-sm">{t('lang.switch')}</span>}
    </button>
  )
}
