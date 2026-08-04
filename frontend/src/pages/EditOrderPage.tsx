import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetOrderQuery, useAddItemsToOrderMutation } from '@/features/orders/ordersApi'
import { MenuItemSearch } from '@/features/orders/MenuItemSearch'
import { OrderItemRow } from '@/features/orders/OrderItemRow'
import type { MenuItemDto, CreateOrderItemRequest } from '@/types/api'
import { CHANNEL_BADGE, ORDER_STATUS_LABEL } from '@/types/enums'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'

interface DraftItem extends CreateOrderItemRequest {
  menuItemName: string
  unitPrice: number
}

export function EditOrderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: order, isLoading, isError } = useGetOrderQuery(id ?? '')
  const [addItems, { isLoading: isSaving }] = useAddItemsToOrderMutation()

  const [newItems, setNewItems] = useState<DraftItem[]>([])
  const [error, setError] = useState<string | null>(null)

  function handleAddItem(menuItem: MenuItemDto) {
    setNewItems((prev) => {
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
    setNewItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)))
  }

  function handleNoteChange(idx: number, note: string) {
    setNewItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, customizationNote: note } : item)),
    )
  }

  function handleRemove(idx: number) {
    setNewItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newItems.length === 0) {
      setError('Add at least one new item.')
      return
    }
    if (!id) return

    try {
      await addItems({
        id,
        data: {
          items: newItems.map(({ menuItemId, quantity, customizationNote }) => ({
            menuItemId,
            quantity,
            customizationNote: customizationNote || undefined,
          })),
        },
      }).unwrap()
      navigate('/orders')
    } catch {
      setError('Failed to add items. Please try again.')
    }
  }

  if (isLoading) return <div className="p-6"><LoadingSpinner /></div>
  if (isError || !order) return <div className="p-6"><ErrorMessage message="Order not found." /></div>

  return (
    <div className="p-6">

      {/* Existing order summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold">{order.orderNumber}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_BADGE[order.channel]}`}
          >
            {order.channel}
          </span>
          <span className="text-sm text-muted-foreground">
            {ORDER_STATUS_LABEL[order.status]}
          </span>
        </div>
        {order.customerName && <p className="text-sm">{order.customerName}</p>}
        <ul className="text-sm space-y-0.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.menuItemName} &times; {item.quantity}
              </span>
              <span className="text-muted-foreground">
                &#8377;{(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-semibold text-right border-t border-border pt-2">
          Current Total: &#8377;{order.totalAmount.toFixed(2)}
        </p>
      </div>

      {/* Add more items form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold">Add More Items</h2>
        <MenuItemSearch onSelect={handleAddItem} />
        {newItems.length === 0 && (
          <p className="text-xs text-muted-foreground">Search and click items to add them.</p>
        )}
        <div className="space-y-2">
          {newItems.map((item, idx) => (
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
        {newItems.length > 0 && (
          <p className="text-sm font-semibold text-right">
            New Items Total: &#8377;
            {newItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving || newItems.length === 0}
            className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
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
