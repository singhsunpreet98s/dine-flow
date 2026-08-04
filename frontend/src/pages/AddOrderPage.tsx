import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useCreateOrderMutation, useGetOrdersQuery } from '@/features/orders/ordersApi'
import { MenuItemSearch } from '@/features/orders/MenuItemSearch'
import { OrderItemRow } from '@/features/orders/OrderItemRow'
import { useGetFloorsQuery } from '@/features/admin/api/floorApi'
import type { MenuItemDto, CreateOrderItemRequest } from '@/types/api'
import { OrderChannel, OrderStatus, CHANNEL_BADGE } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { createOrderSchema, type CreateOrderFormValues } from '@/features/orders/orderSchemas'

interface DraftItem extends CreateOrderItemRequest {
  menuItemName: string
  unitPrice: number
}

export function AddOrderPage() {
  const navigate = useNavigate()
  const [createOrder, { isLoading }] = useCreateOrderMutation()
  const { data: floors } = useGetFloorsQuery()
  const { data: activeOrders } = useGetOrdersQuery()

  // Items are managed outside RHF — they're built via a search picker, not input fields
  const [items, setItems] = useState<DraftItem[]>([])
  const [itemsError, setItemsError] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: yupResolver(createOrderSchema),
    defaultValues: { channel: OrderChannel.DineIn, memberCount: 1 },
  })

  const channel = watch('channel')

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
            o.restaurantTableId !== null &&
            o.status !== OrderStatus.Paid &&
            o.status !== OrderStatus.Closed,
        )
        .map((o) => o.restaurantTableId as string),
    )
  }, [activeOrders])

  function handleAddItem(menuItem: MenuItemDto) {
    setItemsError(null)
    setItems((prev) => {
      const existing = prev.findIndex((i) => i.menuItemId === menuItem.id)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = { ...next[existing], quantity: next[existing].quantity + 1 }
        return next
      }
      return [
        ...prev,
        { menuItemId: menuItem.id, menuItemName: menuItem.name, unitPrice: menuItem.price, quantity: 1 },
      ]
    })
  }

  function handleQuantityChange(idx: number, qty: number) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, quantity: qty } : item)))
  }

  function handleNoteChange(idx: number, note: string) {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, customizationNote: note } : item)))
  }

  function handleRemoveItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleCreate(values: CreateOrderFormValues) {
    if (items.length === 0) {
      setItemsError('Add at least one item.')
      return
    }

    try {
      await createOrder({
        customerName: values.customerName || undefined,
        channel: values.channel,
        memberCount: values.memberCount,
        restaurantTableId:
          values.channel === OrderChannel.DineIn ? values.restaurantTableId : undefined,
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
      setError('root', { message: message ?? 'Failed to create order. Please try again.' })
    }
  }

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit(handleCreate)} className="space-y-5">
        {/* Customer Name */}
        <FormField label="Customer Name" htmlFor="customerName" error={errors.customerName?.message}>
          <Input
            id="customerName"
            placeholder="Walk-in customer (optional)"
            {...register('customerName')}
          />
        </FormField>

        {/* Channel */}
        <div className="space-y-1.5">
          <span className="text-sm font-medium leading-none">
            Order Channel <span className="text-destructive">*</span>
          </span>
          <Controller
            name="channel"
            control={control}
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {Object.values(OrderChannel).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => {
                      field.onChange(ch)
                      if (ch !== OrderChannel.DineIn) setValue('restaurantTableId', undefined)
                    }}
                    className={`rounded-full px-3 py-1 text-sm font-medium border-2 transition-colors ${
                      field.value === ch
                        ? `${CHANNEL_BADGE[ch]} border-current`
                        : 'border-transparent bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            )}
          />
          {errors.channel && <p className="text-sm text-destructive">{errors.channel.message}</p>}
        </div>

        {/* Member Count */}
        <FormField
          label="Member Count"
          htmlFor="memberCount"
          error={errors.memberCount?.message}
          required
        >
          <Input id="memberCount" type="number" min={1} className="w-24" {...register('memberCount')} />
        </FormField>

        {/* Table (DineIn only) */}
        {channel === OrderChannel.DineIn && (
          <FormField
            label="Table"
            htmlFor="restaurantTableId"
            error={errors.restaurantTableId?.message}
            required
          >
            <Controller
              name="restaurantTableId"
              control={control}
              render={({ field }) => (
                <select
                  id="restaurantTableId"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || undefined)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a table...</option>
                  {allTables.map((t) => {
                    const occupied = occupiedTableIds.has(t.id)
                    return (
                      <option key={t.id} value={t.id} disabled={occupied}>
                        {t.label}
                        {occupied ? ' — Occupied' : ''}
                      </option>
                    )
                  })}
                </select>
              )}
            />
          </FormField>
        )}

        {/* Items */}
        <div className="space-y-2">
          <span className="text-sm font-medium leading-none">
            Items <span className="text-destructive">*</span>
          </span>
          <MenuItemSearch onSelect={handleAddItem} />
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground">Search and click items to add them.</p>
          )}
          <div className="space-y-2">
            {items.map((item, idx) => (
              <OrderItemRow
                key={item.menuItemId}
                index={idx}
                item={item}
                onQuantityChange={handleQuantityChange}
                onNoteChange={handleNoteChange}
                onRemove={handleRemoveItem}
              />
            ))}
          </div>
          {items.length > 0 && (
            <p className="text-sm font-semibold text-right">
              Total: &#8377;{items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
            </p>
          )}
          {itemsError && <p className="text-sm text-destructive">{itemsError}</p>}
        </div>

        {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Order'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/orders')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
