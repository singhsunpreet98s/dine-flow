import type { TopItem } from '../dashboardTypes'

interface Props {
  items: TopItem[]
}

export function TopItemsList({ items }: Props) {
  const max = items[0]?.count ?? 1

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, idx) => (
        <li key={item.name} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
              {idx + 1}
            </span>
            <span className="flex-1 truncate text-sm text-foreground">{item.name}</span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{item.count}</span>
          </div>
          <div className="ml-7 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-blue-500"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
