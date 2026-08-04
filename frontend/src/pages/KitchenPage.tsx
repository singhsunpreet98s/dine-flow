import { useSignalR } from '@/hooks/useSignalR'
import { useGetOrdersQuery } from '@/features/orders/ordersApi'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { OrderStatus } from '@/types/enums'

export function KitchenPage() {
  useSignalR()
  const { data: orders, isLoading, isError } = useGetOrdersQuery()

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorMessage />

  const activeOrders = orders?.filter(
    (o) => o.status === OrderStatus.SentToKitchen || o.status === OrderStatus.Preparing
  ) ?? []

  return (
    <div className="p-4">
      <h1 className="mb-4 text-xl font-semibold">Kitchen Queue</h1>
      {activeOrders.length === 0 ? (
        <p className="text-muted-foreground">No active orders.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {activeOrders.map((order) => (
            <div key={order.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="font-mono text-sm font-bold">#{order.orderNumber}</div>
              <div className="mt-1 text-sm text-muted-foreground">{order.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
