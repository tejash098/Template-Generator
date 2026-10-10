import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../../components/ui/Card'
import { ICON_SIZE } from '../../config/constants'

interface PluginCardProps {
  icon: LucideIcon
  name: string
  description: string
  /** Small pill next to the name, e.g. "Coming soon". */
  badge?: { label: string; tone: 'muted' | 'accent' }
  children?: ReactNode
}

const BADGE = {
  muted: 'bg-page-bg text-text-secondary',
  accent: 'bg-accent-subtle text-accent',
}

/** One plugin on the Plugins page: icon, name (+ badge), description, then its own controls. */
export function PluginCard({ icon: Icon, name, description, badge, children }: PluginCardProps) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
          <Icon size={ICON_SIZE.MD} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">{name}</h2>
            {badge && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE[badge.tone]}`}>{badge.label}</span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}
