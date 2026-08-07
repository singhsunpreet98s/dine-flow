import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ChannelPoint } from '../dashboardTypes'
import { CHANNEL_COLOR } from '../dashboardData'

interface Props {
  data: ChannelPoint[]
}

interface TooltipPayloadItem {
  name: string
  value: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs text-muted-foreground">{item.name}</p>
      <p className="text-sm font-semibold text-foreground">{item.value} orders</p>
    </div>
  )
}

export function ChannelBreakdownChart({ data }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="channel"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={2}
            stroke="hsl(var(--card))"
          >
            {data.map((entry) => (
              <Cell key={entry.channel} fill={CHANNEL_COLOR[entry.channel] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-1.5">
        {data.map((entry) => {
          const total = data.reduce((s, d) => s + d.count, 0)
          return (
            <div key={entry.channel} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CHANNEL_COLOR[entry.channel] }}
              />
              <span className="text-xs text-muted-foreground">{entry.channel}</span>
              <span className="ml-auto text-xs font-medium text-foreground">
                {Math.round((entry.count / total) * 100)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
