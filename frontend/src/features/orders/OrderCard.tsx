import { Clock, Pencil, ChevronRight, Loader2, Receipt } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { OrderDto } from '@/types/api'
import { OrderChannel, OrderStatus, ORDER_STATUS_LABEL, UserRole } from '@/types/enums'
import { Badge } from '@/components/ui/badge'
import type { BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/app/hooks'
import { useOrderTimer } from '@/hooks/useOrderTimer'
import { useUpdateOrderStatusMutation } from '@/features/orders/ordersApi'
import { AssignWaiterButton } from '@/features/orders/AssignWaiterButton'
import { formatInTz } from '@/lib/timezone'

interface OrderCardProps {
  order: OrderDto
}

// ── Channel display ──────────────────────────────────────────────────────────

const CHANNEL_ACCENT: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'bg-blue-500',
  [OrderChannel.Takeaway]: 'bg-emerald-500',
  [OrderChannel.Zomato]:   'bg-red-500',
  [OrderChannel.Swiggy]:   'bg-orange-500',
  [OrderChannel.Other]:    'bg-gray-400',
}

const CHANNEL_BADGE_CLASS: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  [OrderChannel.Takeaway]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [OrderChannel.Zomato]:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  [OrderChannel.Swiggy]:   'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  [OrderChannel.Other]:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'Dine-in',
  [OrderChannel.Takeaway]: 'Takeaway',
  [OrderChannel.Zomato]:   'Zomato',
  [OrderChannel.Swiggy]:   'Swiggy',
  [OrderChannel.Other]:    'Other',
}

// ── Status display ───────────────────────────────────────────────────────────

type BadgeVariant = NonNullable<BadgeProps['variant']>

const STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  [OrderStatus.Placed]:        'warning',
  [OrderStatus.SentToKitchen]: 'info',
  [OrderStatus.Preparing]:     'orange',
  [OrderStatus.OutOfStock]:    'destructive',
  [OrderStatus.Prepared]:      'success',
  [OrderStatus.Served]:        'success',
  [OrderStatus.Billed]:        'purple',
  [OrderStatus.Paid]:          'secondary',
  [OrderStatus.Closed]:        'outline',
}

// ── Status advancement ───────────────────────────────────────────────────────

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.Placed]:        OrderStatus.SentToKitchen,
  [OrderStatus.SentToKitchen]: OrderStatus.Preparing,
  [OrderStatus.Preparing]:     OrderStatus.Prepared,
  [OrderStatus.OutOfStock]:    OrderStatus.Preparing,
  [OrderStatus.Prepared]:      OrderStatus.Served,
  [OrderStatus.Served]:        OrderStatus.Billed,
  [OrderStatus.Billed]:        OrderStatus.Paid,
  [OrderStatus.Paid]:          OrderStatus.Closed,
}

const STATUS_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Placed]:        'Send to Kitchen',
  [OrderStatus.SentToKitchen]: 'Start Preparing',
  [OrderStatus.Preparing]:     'Mark Ready',
  [OrderStatus.OutOfStock]:    'Back to Preparing',
  [OrderStatus.Prepared]:      'Mark Served',
  [OrderStatus.Served]:        'Generate Bill',
  [OrderStatus.Billed]:        'Mark Paid',
  [OrderStatus.Paid]:          'Close Order',
}

// Which roles may advance from each status
const CAN_ADVANCE: Partial<Record<OrderStatus, ReadonlySet<UserRole>>> = {
  [OrderStatus.Placed]:        new Set([UserRole.Admin, UserRole.Manager, UserRole.Waiter]),
  [OrderStatus.SentToKitchen]: new Set([UserRole.Admin, UserRole.Manager, UserRole.Kitchen]),
  [OrderStatus.Preparing]:     new Set([UserRole.Admin, UserRole.Manager, UserRole.Kitchen]),
  [OrderStatus.OutOfStock]:    new Set([UserRole.Admin, UserRole.Manager, UserRole.Kitchen]),
  [OrderStatus.Prepared]:      new Set([UserRole.Admin, UserRole.Manager, UserRole.Waiter]),
  [OrderStatus.Served]:        new Set([UserRole.Admin, UserRole.Manager]),
  [OrderStatus.Billed]:        new Set([UserRole.Admin, UserRole.Manager]),
  [OrderStatus.Paid]:          new Set([UserRole.Admin, UserRole.Manager]),
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(minutes: number): string {
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

// ── Component ────────────────────────────────────────────────────────────────

export function OrderCard({ order }: OrderCardProps) {
  const role = useAppSelector((s) => s.auth.role)
  const timeZoneId = useAppSelector((s) => s.auth.timeZoneId) ?? 'UTC'
  const { elapsed, isDelayed } = useOrderTimer(order.createdAt)
  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation()

  const nextStatus = STATUS_NEXT[order.status]
  const actionLabel = STATUS_ACTION_LABEL[order.status]
  const canAdvance =
    role !== null &&
    nextStatus !== undefined &&
    (CAN_ADVANCE[order.status]?.has(role) ?? false)

  const canEdit =
    role === UserRole.Admin || role === UserRole.Manager || role === UserRole.Waiter

  const canViewBill =
    (role === UserRole.Admin || role === UserRole.Manager || role === UserRole.Waiter) &&
    (order.status === OrderStatus.Billed ||
      order.status === OrderStatus.Paid ||
      order.status === OrderStatus.Closed)

  function handleAdvanceStatus() {
    if (!nextStatus) return
    updateStatus({ id: order.id, status: nextStatus })
  }

  return (
    // h-full + flex-col lets CSS Grid stretch all cards in a row to the same height
    <div
      className={`
        flex h-full overflow-hidden rounded-xl border bg-card
        shadow-sm transition-all duration-200 hover:shadow-md
        ${isDelayed ? 'border-red-300 dark:border-red-700' : 'border-border'}
      `}
    >
      {/* Left channel accent bar */}
      <div className={`w-1 shrink-0 ${CHANNEL_ACCENT[order.channel]}`} />

      {/* Card body — flex-col so items section can grow and footer stays at bottom */}
      <div className="flex min-w-0 flex-1 flex-col px-3.5 py-3.5">

        {/* ── Order number + channel badge ── */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold leading-none tracking-tight text-foreground">
            {order.orderNumber}
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHANNEL_BADGE_CLASS[order.channel]}`}>
            {CHANNEL_LABEL[order.channel]}
          </span>
        </div>

        {/* ── Customer + timer ── */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {order.customerName ?? 'Walk-in'}
            {' · '}{order.memberCount} {order.memberCount === 1 ? 'guest' : 'guests'}
            {order.assignedWaiterName && ` · ${order.assignedWaiterName}`}
          </p>
          <div
            className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
              isDelayed ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
            {isDelayed && (
              <span className="rounded bg-red-100 px-1 py-px text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                late
              </span>
            )}
          </div>
        </div>

        {/* ── Placed-at timestamp (timezone-aware) ── */}
        <p className="text-[11px] text-muted-foreground">
          {formatInTz(order.createdAt, timeZoneId)}
        </p>

        {/* ── Items — flex-1 pushes footer to bottom ── */}
        <div className="mt-3 flex-1 space-y-1.5 border-t border-border pt-3">
          {order.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-foreground/90">
                {item.menuItemName}
                <span className="ml-1 text-muted-foreground">×{item.quantity}</span>
              </span>
              {item.customizationNote && (
                <span className="max-w-[80px] shrink-0 truncate text-[11px] italic text-muted-foreground">
                  {item.customizationNote}
                </span>
              )}
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-[11px] text-muted-foreground">
              +{order.items.length - 3} more
            </p>
          )}
        </div>

        {/* ── Footer — always at bottom ── */}
        <div className="mt-3 space-y-2 border-t border-border pt-3">

          {/* Amount + status badge + edit link */}
          <div className="flex items-center justify-between gap-2">
            <Badge variant={STATUS_VARIANT[order.status]} className="shrink-0 text-[11px]">
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-foreground">
                {formatAmount(order.totalAmount)}
              </span>
              {canViewBill && (
                <Link
                  to={`/orders/${order.id}/bill`}
                  className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  <Receipt className="h-3 w-3" />
                  Bill
                </Link>
              )}
              {canEdit && (
                <Link
                  to={`/orders/${order.id}/edit`}
                  className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* Advance status button */}
          {canAdvance && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-full gap-1.5 text-xs"
              onClick={handleAdvanceStatus}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {actionLabel}
            </Button>
          )}

          {/* Assign waiter (admin only) */}
          {role === UserRole.Admin && (
            <AssignWaiterButton orderId={order.id} assignedWaiterId={order.assignedWaiterId} />
          )}

        </div>
      </div>
    </div>
  )
}
