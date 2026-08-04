import type { CreateOrderItemRequest } from '@/types/api'

interface OrderItemRowProps {
  index: number
  item: CreateOrderItemRequest & { menuItemName: string; unitPrice: number }
  onQuantityChange: (index: number, qty: number) => void
  onNoteChange: (index: number, note: string) => void
  onRemove: (index: number) => void
}

export function OrderItemRow({
  index,
  item,
  onQuantityChange,
  onNoteChange,
  onRemove,
}: OrderItemRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
      <div className="flex-1 min-w-[140px]">
        <p className="text-sm font-medium">{item.menuItemName}</p>
        <p className="text-xs text-muted-foreground">&#8377;{item.unitPrice.toFixed(2)} each</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => item.quantity > 1 && onQuantityChange(index, item.quantity - 1)}
          className="h-7 w-7 rounded border border-input bg-background text-sm font-bold hover:bg-accent disabled:opacity-50"
          disabled={item.quantity <= 1}
        >
          &minus;
        </button>
        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
        <button
          type="button"
          onClick={() => onQuantityChange(index, item.quantity + 1)}
          className="h-7 w-7 rounded border border-input bg-background text-sm font-bold hover:bg-accent"
        >
          +
        </button>
      </div>
      <input
        type="text"
        value={item.customizationNote ?? ''}
        onChange={(e) => onNoteChange(index, e.target.value)}
        placeholder="Note (optional)"
        className="flex-1 min-w-[120px] rounded border border-input bg-background px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-xs text-destructive hover:underline"
      >
        Remove
      </button>
    </div>
  )
}
