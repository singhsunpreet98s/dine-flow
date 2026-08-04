import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ShoppingBag, AlertCircle } from 'lucide-react'
import { useGetOrdersQuery } from '@/features/orders/ordersApi'
import { OrderCard } from '@/features/orders/OrderCard'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { Button } from '@/components/ui/button'
import { OrderChannel } from '@/types/enums'
import { useOrdersSignalR } from '@/hooks/useOrdersSignalR'
import { toUtcDate } from '@/lib/timezone'

type ChannelFilter = OrderChannel | 'All'

const CHANNEL_FILTERS: ChannelFilter[] = [
  'All',
  OrderChannel.DineIn,
  OrderChannel.Takeaway,
  OrderChannel.Zomato,
  OrderChannel.Swiggy,
  OrderChannel.Other,
]

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'Dine-in',
  [OrderChannel.Takeaway]: 'Takeaway',
  [OrderChannel.Zomato]:   'Zomato',
  [OrderChannel.Swiggy]:   'Swiggy',
  [OrderChannel.Other]:    'Other',
}

const CHANNEL_DOT: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'bg-blue-500',
  [OrderChannel.Takeaway]: 'bg-green-500',
  [OrderChannel.Zomato]:   'bg-red-500',
  [OrderChannel.Swiggy]:   'bg-orange-500',
  [OrderChannel.Other]:    'bg-gray-400',
}

const DELAYED_THRESHOLD_MS = 15 * 60_000

export function OrdersPage() {
  useOrdersSignalR()
  const { data: orders, isLoading, isError } = useGetOrdersQuery()
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('All')

  const filtered = useMemo(() => {
    if (!orders) return []
    if (channelFilter === 'All') return orders
    return orders.filter((o) => o.channel === channelFilter)
  }, [orders, channelFilter])

  const delayedCount = useMemo(() => {
    if (!orders) return 0
    const now = Date.now()
    return orders.filter((o) => now - toUtcDate(o.createdAt).getTime() >= DELAYED_THRESHOLD_MS).length
  }, [orders])

  function countFor(channel: ChannelFilter) {
    if (!orders) return 0
    return channel === 'All'
      ? orders.length
      : orders.filter((o) => o.channel === channel).length
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {orders && orders.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              {orders.length} active
            </span>
          )}
          {delayedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {delayedCount} overdue
            </span>
          )}
        </div>
        <Button asChild size="sm">
          <Link to="/orders/new">
            <Plus className="mr-1.5 h-4 w-4" />
            New Order
          </Link>
        </Button>
      </div>

      {/* Channel filters */}
      {orders && orders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {CHANNEL_FILTERS.map((ch) => {
            const count = countFor(ch)
            const isActive = channelFilter === ch
            return (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`
                  flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium
                  ring-1 ring-inset transition-all
                  ${isActive
                    ? 'bg-foreground text-background ring-transparent'
                    : 'bg-background text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/40'
                  }
                `}
              >
                {ch !== 'All' && (
                  <span className={`h-2 w-2 shrink-0 rounded-full ${CHANNEL_DOT[ch]}`} />
                )}
                {ch === 'All' ? 'All' : CHANNEL_LABEL[ch]}
                <span
                  className={`rounded-full px-1.5 py-px text-xs tabular-nums ${
                    isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* States */}
      {isLoading && <LoadingSpinner />}
      {isError && <ErrorMessage message="Failed to load orders." />}

      {!isLoading && !isError && orders?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold text-foreground">No active orders</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New orders will appear here in real time.
          </p>
          <Button asChild size="sm" className="mt-6">
            <Link to="/orders/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Place first order
            </Link>
          </Button>
        </div>
      )}

      {filtered.length === 0 && (orders?.length ?? 0) > 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No {channelFilter === OrderChannel.DineIn ? 'Dine-in' : channelFilter} orders right now.
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
