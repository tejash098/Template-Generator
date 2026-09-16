import { Moon, Sun } from 'lucide-react'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { useLocale } from '../../i18n/useLocale'
import { useTheme } from '../../theme/useTheme'

/** Light/dark switch. `compact` hides the text label (collapsed sidebar). */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme()
  const { t } = useLocale()
  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark')
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`flex items-center gap-2 rounded-lg p-2 text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
    >
      {theme === 'dark' ? <Sun size={ICON_SIZE.MD} aria-hidden="true" /> : <Moon size={ICON_SIZE.MD} aria-hidden="true" />}
      {!compact && <span className="text-sm">{theme === 'dark' ? t('theme.light') : t('theme.dark')}</span>}
    </button>
  )
}
