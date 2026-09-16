import { Menu } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/nav/Sidebar'
import { Logo } from '../components/ui/Logo'
import { A11Y, ICON_SIZE, TRANSITION } from '../config/constants'
import { useLocale } from '../i18n/useLocale'
import { useSidebar } from '../layout/useSidebar'

/**
 * Master layout. Desktop: the sidebar is in flow and toggles wide/narrow.
 * Mobile: it is a fixed drawer over the content with a scrim.
 * The `app-shell` / `app-main` / `no-print` hooks are used by styles/print.css.
 */
export function AppShell() {
  const { isOpen, toggle } = useSidebar()
  const { t } = useLocale()

  return (
    <div className={`app-shell page-gradient flex h-screen overflow-hidden bg-page-bg ${TRANSITION.COLORS_SLOW}`}>
      {isOpen && (
        <div
          onClick={toggle}
          aria-hidden="true"
          className={`no-print fixed inset-0 z-30 bg-scrim md:hidden ${A11Y.MOTION_SAFE}`}
        />
      )}

      <div
        className={`no-print fixed top-0 left-0 z-40 h-full w-64 border-r border-border bg-sidebar-bg transition-transform duration-300 ease-in-out md:static md:shrink-0 md:transition-all ${A11Y.MOTION_SAFE} ${
          isOpen ? 'translate-x-0 md:w-56' : '-translate-x-full md:w-16 md:translate-x-0'
        }`}
      >
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={`no-print flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar-bg px-3 md:hidden ${TRANSITION.COLORS_SLOW}`}
        >
          <button
            type="button"
            onClick={toggle}
            aria-label={t('nav.openMenu')}
            className={`rounded-lg p-2 text-text-secondary hover:bg-accent-subtle hover:text-accent ${TRANSITION.COLORS} ${A11Y.FOCUS_RING}`}
          >
            <Menu size={ICON_SIZE.LG} aria-hidden="true" />
          </button>
          <span className="flex items-center gap-2">
            <Logo size={26} />
            <span lang="hi" className="text-sm font-semibold text-text-primary">
              {t('app.brandHindi')}
            </span>
          </span>
          <span className="w-10" aria-hidden="true" />
        </header>

        <main className="app-main flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
