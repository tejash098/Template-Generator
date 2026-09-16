import { Bus, LayoutGrid, type LucideIcon } from 'lucide-react'
import type { StringKey } from '../i18n/strings'

export interface NavItemDef {
  id: string
  labelKey: StringKey
  path: string
  icon: LucideIcon
  /** Match the path exactly (for `/`). */
  end?: boolean
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'templates', labelKey: 'nav.templates', path: '/', icon: LayoutGrid, end: true },
  { id: 'bookings', labelKey: 'nav.bookings', path: '/bookings', icon: Bus },
]
