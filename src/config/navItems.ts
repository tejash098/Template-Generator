import { Bus, LayoutGrid, Puzzle, Users, type LucideIcon } from 'lucide-react'
import type { StringKey } from '../i18n/strings'

export interface NavItemDef {
  id: string
  labelKey: StringKey
  path: string
  icon: LucideIcon
  /** Match the path exactly. */
  end?: boolean
  /** Shown only to organization owners (admins). */
  ownerOnly?: boolean
  /** Shown only to signed-in members (any role). */
  memberOnly?: boolean
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'templates', labelKey: 'nav.templates', path: '/templates', icon: LayoutGrid, end: true },
  { id: 'bookings', labelKey: 'nav.bookings', path: '/bookings', icon: Bus },
  { id: 'plugins', labelKey: 'nav.plugins', path: '/plugins', icon: Puzzle, memberOnly: true },
  { id: 'team', labelKey: 'nav.team', path: '/team', icon: Users, ownerOnly: true },
]
