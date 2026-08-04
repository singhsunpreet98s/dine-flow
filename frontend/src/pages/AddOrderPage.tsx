import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateOrderMutation, useGetOrdersQuery } from '@/features/orders/ordersApi'
import { MenuItemSearch } from '@/features/orders/MenuItemSearch'
import { OrderItemRow } from '@/features/orders/OrderItemRow'
import { useGetFloorsQuery } from '@/features/admin/api/floorApi'
import type { MenuItemDto, CreateOrderItemRequest } from '@/types/api'
import { OrderChannel, OrderStatus, CHANNEL_BADGE } from '@/types/enums'
interface DraftItem extends CreateOrderItemRequest {
  menuItemName: string
  unitPrice: number
}

export function AddOrderPage() {
  const navigate = useNavigate()
  const [createOrder, { isLoading }] = useCreateOrderMutation()
  const { data: floors } = useGetFloorsQuery()
  const { data: activeOrders } = useGetOrdersQuery()

  const [customerName, setCustomerName] = useState('')
  const [channel, setChannel] = useState<OrderChannel>(OrderChannel.DineIn)
  const [memberCount, setMemberCount] = useState(1)
  const [tableId, setTableId] = useState('')
  const [items, setItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Flatten floors -> tables for dropdown
  const allTables = (floors ?? []).flatMap((floor) =>
    floor.tables.map((t) => ({ id: t.id, label: `${floor.name} — Table ${t.tableNumber}` })),
  )

  // Table IDs that already have an active (non-Paid, non-Closed) order
  const occupiedTableIds = useMemo(() => {
    if (!activeOrders) return new Set<string>()
    return new Set(
      activeOrders
        .filter(
          (o) =>
            o.tableId !== null &&
            o.status !== OrderStatus.Paid &&
            o.status !== OrderStatus.Closed,
        )
        .map((o) => o.tableId as string),
    )
  }, [activeOrders])

  function handleAddItem(menuItem: MenuItemDto) {
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.menuItemId === menuItem.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 }
        return next
      }
      return [
        ...prev,
        {
          menuItemId: menuItem.id,
          menuItemName: menuItem.name,
          unitPrice: menuItem.price,
          quantity: 1,
        },
      ]
    })
  }

  function handleQuantityChange(idx: number, qty: number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)))
  }

  function handleNoteChange(idx: number, note: string) {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, customizationNote: note } : item)),
    )
  }

  function handleRemove(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (items.length === 0) {
      setError('Add at least one item.')
      return
    }
    if (channel === OrderChannel.DineIn && !tableId) {
      setError('Select a table for dine-in orders.')
      return
    }

    try {
      await createOrder({
        customerName: customerName || undefined,
        channel,
        memberCount,
        tableId: channel === OrderChannel.DineIn ? tableId : undefined,
        items: items.map(({ menuItemId, quantity, customizationNote }) => ({
          menuItemId,
          quantity,
          customizationNote: customizationNote || undefined,
        })),
      }).unwrap()
      navigate('/orders')
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'data' in err
          ? (err as { data?: { message?: string } }).data?.message
          : undefined
      setError(message ?? 'Failed to create order. Please try again.')
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer Name */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Customer Name</label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Walk-in customer (optional)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Channel */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Order Channel <span className="text-destructive">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.values(OrderChannel).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  setChannel(ch)
                  if (ch !== OrderChannel.DineIn) setTableId('')
                }}
                className={`rounded-full px-3 py-1 text-sm font-medium border-2 transition-colors ${
                  channel === ch
                    ? `${CHANNEL_BADGE[ch]} border-current`
                    : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Member Count */}
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Member Count <span className="text-destructive">*</span>
          </label>
          <input
            type="number"
            min={1}
            value={memberCount}
            onChange={(e) => setMemberCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Table (DineIn only) */}
        {channel === OrderChannel.DineIn && (
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Table <span className="text-destructive">*</span>
            </label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full rounded-md border border-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select a table...</option>
              {allTables.map((t) => {
                const occupied = occupiedTableIds.has(t.id)
                return (
                  <option key={t.id} value={t.id} disabled={occupied}>
                    {t.label}{occupied ? ' — Occupied' : ''}
                  </option>
                )
              })}
            </select>
          </div>
        )}

        {/* Items */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Items <span className="text-destructive">*</span>
          </label>
          <MenuItemSearch onSelect={handleAddItem} />
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Search and click items to add them.
            </p>
          )}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <OrderItemRow
                key={item.menuItemId}
                index={idx}
                item={item}
                onQuantityChange={handleQuantityChange}
                onNoteChange={handleNoteChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
          {items.length > 0 && (
            <p className="text-sm font-semibold text-right">
              Total: &#8377;
              {items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
            </p>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Order'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="rounded-md border border-input px-6 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

