import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'
import { NAV_ITEMS } from '../../config/navItems'
import { useLocale } from '../../i18n/useLocale'
import { SIDEBAR_DRAWER_BREAKPOINT } from '../../layout/SidebarProvider'
import { useSidebar } from '../../layout/useSidebar'
import { LanguageToggle } from '../ui/LanguageToggle'
import { ThemeToggle } from '../ui/ThemeToggle'
import { NavItem } from './NavItem'

/** Brand lockup: accent mark + Hindi wordmark (wordmark hidden when collapsed). */
function Brand({ showWordmark }: { showWordmark: boolean }) {
  const { t } = useLocale()
  return (
    <Link to="/" className={`flex min-w-0 items-center gap-2.5 rounded-lg ${A11Y.FOCUS_RING}`} title={t('app.brand')}>
      <span className="h-7 w-7 shrink-0 rounded-lg bg-accent" aria-hidden="true" />
      {showWordmark && (
        <span lang="hi" className="truncate text-sm font-semibold text-text-primary">
          {t('app.brandHindi')}
        </span>
      )}
    </Link>
  )
}

/** Sidebar contents: brand + collapse toggle, nav list, theme & language toggles. */
export function Sidebar() {
  const { isOpen, toggle, close } = useSidebar()
  const { t } = useLocale()

  // On phones the sidebar is a drawer; close it after navigating.
  const handleNavClick = () => {
    if (window.innerWidth < SIDEBAR_DRAWER_BREAKPOINT) close()
  }

  return (
    <aside className="flex h-full w-full flex-col">
      <div
        className={`shrink-0 border-b border-border px-3 ${
          isOpen ? 'flex h-16 items-center justify-between' : 'flex flex-col items-center gap-2 py-3'
        }`}
      >
        <Brand showWordmark={isOpen} />
        <button
          type="button"
          onClick={toggle}
          title={isOpen ? t('nav.collapse') : t('nav.expand')}
          aria-label={isOpen ? t('nav.collapse') : t('nav.expand')}
          className={`flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
        >
          {isOpen ? (
            <ChevronLeft size={ICON_SIZE.SM} aria-hidden="true" />
          ) : (
            <ChevronRight size={ICON_SIZE.SM} aria-hidden="true" />
          )}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto py-4" onClick={handleNavClick}>
        {NAV_ITEMS.map(({ id, icon, labelKey, path, end }) => (
          <NavItem key={id} icon={icon} label={t(labelKey)} path={path} end={end} isOpen={isOpen} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <div className={isOpen ? 'flex items-center justify-between gap-2' : 'flex flex-col items-center gap-2'}>
          <ThemeToggle compact={!isOpen} />
          <LanguageToggle compact={!isOpen} />
        </div>
      </div>
    </aside>
  )
}
