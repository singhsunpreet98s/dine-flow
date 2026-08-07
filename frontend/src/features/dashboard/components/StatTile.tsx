import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  iconContainerClass?: string
  iconClass?: string
  badge?: ReactNode
}

export function StatTile({
  label,
  value,
  icon: Icon,
  description,
  iconContainerClass = 'bg-muted',
  iconClass = 'text-muted-foreground',
  badge,
}: StatTileProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconContainerClass}`}>
          <Icon className={`h-4 w-4 ${iconClass}`} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {badge && <div>{badge}</div>}
    </div>
  )
}
