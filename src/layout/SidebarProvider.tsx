import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { SidebarContext } from './SidebarContext'

/** Tailwind `md` breakpoint: below it the sidebar is a drawer. */
export const SIDEBAR_DRAWER_BREAKPOINT = 768

/** Open/closed state of the sidebar (expanded/collapsed on desktop, drawer on mobile). */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= SIDEBAR_DRAWER_BREAKPOINT,
  )
  const toggle = useCallback(() => setOpen((o) => !o), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ isOpen, toggle, close }), [isOpen, toggle, close])
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
