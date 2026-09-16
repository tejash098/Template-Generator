import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { A11Y, ICON_SIZE, TRANSITION } from '../../config/constants'

interface NavItemProps {
  icon: LucideIcon
  label: string
  path: string
  isOpen: boolean
  end?: boolean
}

/** Sidebar link: icon always, label only when expanded, active state from the router. */
export function NavItem({ icon: Icon, label, path, isOpen, end }: NavItemProps) {
  return (
    <NavLink
      to={path}
      end={end}
      title={!isOpen ? label : undefined}
      className={({ isActive }) =>
        `mx-2 flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 ${TRANSITION.COLORS} ${A11Y.FOCUS_RING} ${
          isActive
            ? 'border-accent bg-accent-subtle text-accent'
            : 'border-transparent text-text-secondary hover:bg-accent-subtle hover:text-accent'
        } ${isOpen ? '' : 'justify-center'}`
      }
    >
      <Icon size={ICON_SIZE.MD} className="shrink-0" aria-hidden="true" />
      {isOpen && <span className="overflow-hidden text-sm font-medium whitespace-nowrap">{label}</span>}
    </NavLink>
  )
}
