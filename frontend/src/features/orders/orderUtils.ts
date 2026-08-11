import { OrderStatus } from '@/types/enums'

/**
 * Returns true when items can still be added to the order.
 * Only Paid and Closed orders are locked — every earlier status is editable.
 */
export function isOrderEditable(status: OrderStatus): boolean {
  return status !== OrderStatus.Paid && status !== OrderStatus.Closed
}
