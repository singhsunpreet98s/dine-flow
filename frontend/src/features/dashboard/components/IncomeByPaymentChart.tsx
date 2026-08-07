import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { IncomeByModePoint } from '../dashboardTypes'
import { INCOME_MODE_COLOR } from '../dashboardData'

interface Props {
  data: IncomeByModePoint[]
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
      <p className="text-sm font-semibold text-foreground">
        ₹{item.value.toLocaleString('en-IN')}
      </p>
    </div>
  )
}

export function IncomeByPaymentChart({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="mode"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={2}
            stroke="hsl(var(--card))"
          >
            {data.map((entry) => (
              <Cell key={entry.mode} fill={INCOME_MODE_COLOR[entry.mode] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-1.5">
        {data.map((entry) => (
          <div key={entry.mode} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: INCOME_MODE_COLOR[entry.mode] }}
            />
            <span className="text-xs text-muted-foreground">{entry.mode}</span>
            <span className="ml-auto text-xs font-medium text-foreground">
              {Math.round((entry.amount / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
