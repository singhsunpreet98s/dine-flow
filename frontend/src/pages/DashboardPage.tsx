import {
  ShoppingBag,
  ClipboardList,
  Clock,
  AlertTriangle,
  TrendingUp,
  IndianRupee,
  LayoutGrid,
  XCircle,
} from 'lucide-react'
import { useGetDashboardStatsQuery } from '@/features/dashboard/dashboardApi'
import { StatTile } from '@/features/dashboard/components/StatTile'
import { DailyOrdersChart } from '@/features/dashboard/components/DailyOrdersChart'
import { IncomeByPaymentChart } from '@/features/dashboard/components/IncomeByPaymentChart'
import { ChannelBreakdownChart } from '@/features/dashboard/components/ChannelBreakdownChart'
import { TopItemsList } from '@/features/dashboard/components/TopItemsList'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface SectionHeaderProps {
  title: string
  description: string
}

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

export function DashboardPage() {
  const { data: stats, isLoading, isError } = useGetDashboardStatsQuery()

  if (isLoading) return <LoadingSpinner />
  if (isError || !stats) return <ErrorMessage message="Failed to load dashboard stats." />

  const hasDelays = stats.delayedOrders > 0

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* ── Today's Snapshot ── */}
      <section>
        <SectionHeader
          title="Today's Snapshot"
          description="Key metrics for today's service at a glance."
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Total Orders"
            value={stats.totalOrders.toLocaleString('en-IN')}
            icon={ShoppingBag}
            description="All-time order count"
          />

          <StatTile
            label="Today's Orders"
            value={stats.todayOrders}
            icon={ClipboardList}
            description="Placed since midnight"
          />

          <StatTile
            label="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            iconContainerClass="bg-amber-100 dark:bg-amber-900/30"
            iconClass="text-amber-600 dark:text-amber-400"
            description="Active — not yet closed"
          />

          <StatTile
            label="Delayed Orders"
            value={stats.delayedOrders}
            icon={AlertTriangle}
            iconContainerClass={
              hasDelays
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-muted'
            }
            iconClass={
              hasDelays
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }
            description="Open longer than 30 min"
            badge={
              hasDelays ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  Action needed
                </span>
              ) : undefined
            }
          />

          <StatTile
            label="Daily Average"
            value={stats.dailyAverage}
            icon={TrendingUp}
            description="Rolling 30-day average"
          />

          <StatTile
            label="Today's Income"
            value={`₹${stats.todayIncome.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            iconContainerClass="bg-green-100 dark:bg-green-900/30"
            iconClass="text-green-600 dark:text-green-400"
            description="Revenue collected today"
          />

          <StatTile
            label="Tables Occupied"
            value={`${stats.tablesOccupied} / ${stats.totalTables}`}
            icon={LayoutGrid}
            description="Live occupancy"
          />

          <StatTile
            label="Cancelled Orders"
            value={stats.cancelledOrders}
            icon={XCircle}
            description="Void or cancelled today"
          />
        </div>
      </section>

      {/* ── Order Trends ── */}
      <section>
        <SectionHeader
          title="Order Trends"
          description="Daily order volume over the last 14 days."
        />

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <DailyOrdersChart data={stats.dailyOrders} />
        </div>
      </section>

      {/* ── Breakdown ── */}
      <section>
        <SectionHeader
          title="Breakdown"
          description="Today's revenue and order distribution by payment mode, channel, and top items."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Income by Payment Mode">
            <IncomeByPaymentChart data={stats.incomeByMode} />
          </ChartCard>

          <ChartCard title="Orders by Channel">
            <ChannelBreakdownChart data={stats.ordersByChannel} />
          </ChartCard>

          <ChartCard title="Top 5 Items Today">
            <TopItemsList items={stats.topItems} />
          </ChartCard>
        </div>
      </section>
    </div>
  )
}
