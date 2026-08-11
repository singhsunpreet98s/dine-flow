import { OrderStatus } from '@/types/enums'
import { isOrderEditable } from '@/features/orders/orderUtils'

describe('isOrderEditable', () => {
  it('returns true for Placed', () => {
    expect(isOrderEditable(OrderStatus.Placed)).toBe(true)
  })

  it('returns true for SentToKitchen', () => {
    expect(isOrderEditable(OrderStatus.SentToKitchen)).toBe(true)
  })

  it('returns true for Preparing', () => {
    expect(isOrderEditable(OrderStatus.Preparing)).toBe(true)
  })

  it('returns true for OutOfStock', () => {
    expect(isOrderEditable(OrderStatus.OutOfStock)).toBe(true)
  })

  it('returns true for Prepared', () => {
    expect(isOrderEditable(OrderStatus.Prepared)).toBe(true)
  })

  it('returns true for Served', () => {
    expect(isOrderEditable(OrderStatus.Served)).toBe(true)
  })

  it('returns true for Billed', () => {
    expect(isOrderEditable(OrderStatus.Billed)).toBe(true)
  })

  it('returns false for Paid', () => {
    expect(isOrderEditable(OrderStatus.Paid)).toBe(false)
  })

  it('returns false for Closed', () => {
    expect(isOrderEditable(OrderStatus.Closed)).toBe(false)
  })
})
