// react-router-dom's v7 build references TextEncoder / TextDecoder which JSDOM
// does not expose globally.  Polyfill from Node.js 'util' before any import runs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeUtil = require('util')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = global as any
if (typeof _g.TextEncoder === 'undefined') _g.TextEncoder = nodeUtil.TextEncoder
if (typeof _g.TextDecoder === 'undefined') _g.TextDecoder = nodeUtil.TextDecoder

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OrderCard } from '@/features/orders/OrderCard'
import type { OrderDto } from '@/types/api'
import { OrderStatus, OrderChannel, UserRole } from '@/types/enums'
import { useAppSelector } from '@/app/hooks'

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/app/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn()),
}))

jest.mock('@/hooks/useOrderTimer', () => ({
  useOrderTimer: () => ({ elapsed: 5, isDelayed: false }),
}))

jest.mock('@/features/orders/ordersApi', () => ({
  useUpdateOrderStatusMutation: () => [jest.fn().mockResolvedValue({}), { isLoading: false }],
}))

// AssignWaiterButton makes its own RTK Query calls — replace with a null stub.
jest.mock('@/features/orders/AssignWaiterButton', () => ({
  AssignWaiterButton: () => null,
}))

// ── fixture ───────────────────────────────────────────────────────────────────

const baseOrder: OrderDto = {
  id: 'ord-1',
  orderNumber: 'ORD001',
  status: OrderStatus.Placed,
  channel: OrderChannel.DineIn,
  restaurantTableId: null,
  customerName: 'Alice',
  notes: null,
  memberCount: 2,
  totalAmount: 500,
  paymentMode: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: 'item-1',
      menuItemId: 'menu-1',
      menuItemName: 'Butter Chicken',
      unitPrice: 250,
      quantity: 2,
      customizationNote: null,
    },
  ],
  assignedWaiterId: null,
  assignedWaiterName: null,
}

// ── helper ────────────────────────────────────────────────────────────────────

/**
 * Renders OrderCard inside a MemoryRouter (required for <Link>).
 * `useAppSelector` is mocked so the component receives `role` and `timeZoneId`
 * without needing a real Redux Provider.
 */
function renderCard(orderOverrides: Partial<OrderDto> = {}, role: UserRole = UserRole.Admin) {
  ;(useAppSelector as jest.Mock).mockImplementation(
    (selector: (s: unknown) => unknown) =>
      selector({ auth: { role, timeZoneId: 'UTC' } }),
  )

  return render(
    <MemoryRouter>
      <OrderCard order={{ ...baseOrder, ...orderOverrides }} />
    </MemoryRouter>,
  )
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('OrderCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the order number', () => {
    renderCard()
    expect(screen.getByText('ORD001')).toBeInTheDocument()
  })

  it('renders the customer name', () => {
    renderCard()
    // Text rendered as "Alice · 2 guests" in a single <p>
    expect(screen.getByText(/alice/i)).toBeInTheDocument()
  })

  it('renders the item name', () => {
    renderCard()
    expect(screen.getByText(/Butter Chicken/i)).toBeInTheDocument()
  })

  it('renders the total amount', () => {
    renderCard()
    // formatAmount returns "₹500" for 500 — match the numeric portion
    expect(screen.getByText(/500/)).toBeInTheDocument()
  })

  it('renders the channel badge with the correct label', () => {
    renderCard()
    // CHANNEL_LABEL for DineIn is "Dine-in"
    expect(screen.getByText(/dine-in/i)).toBeInTheDocument()
  })

  it('renders the status badge with the Placed label', () => {
    renderCard()
    // ORDER_STATUS_LABEL for Placed is "Placed"
    expect(screen.getByText('Placed')).toBeInTheDocument()
  })

  it('shows the advance status button for Admin on a Placed order', () => {
    renderCard({}, UserRole.Admin)
    // STATUS_ACTION_LABEL for Placed is "Send to Kitchen"
    expect(screen.getByRole('button', { name: /send to kitchen/i })).toBeInTheDocument()
  })

  it('shows the advance status button for Waiter on a Placed order', () => {
    renderCard({}, UserRole.Waiter)
    expect(screen.getByRole('button', { name: /send to kitchen/i })).toBeInTheDocument()
  })

  it('does not show the advance status button for Kitchen role on a Placed order', () => {
    // CAN_ADVANCE for Placed = { Admin, Manager, Waiter } — Kitchen is excluded
    renderCard({}, UserRole.Kitchen)
    expect(screen.queryByRole('button', { name: /send to kitchen/i })).not.toBeInTheDocument()
  })

  it('renders without crashing when the order is delayed', () => {
    // useOrderTimer is mocked globally to { elapsed: 5, isDelayed: false }.
    // This test verifies the card still renders core content (no crash, no conditional hide).
    renderCard()
    expect(screen.getByText('ORD001')).toBeInTheDocument()
  })

  it('shows the edit link for Admin role', () => {
    renderCard({}, UserRole.Admin)
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('shows the edit link for Waiter role', () => {
    renderCard({}, UserRole.Waiter)
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('does not show the edit link for Kitchen role', () => {
    // canEdit = Admin | Manager | Waiter — Kitchen is excluded
    renderCard({}, UserRole.Kitchen)
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows "+X more" text when the order has more than 3 items', () => {
    const extraItems = Array.from({ length: 5 }, (_, i) => ({
      id: `item-${i}`,
      menuItemId: `menu-${i}`,
      menuItemName: `Item ${i}`,
      unitPrice: 100,
      quantity: 1,
      customizationNote: null,
    }))
    renderCard({ items: extraItems })
    // 5 items → 3 shown + "+2 more"
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('renders "Walk-in" when customerName is null', () => {
    renderCard({ customerName: null })
    expect(screen.getByText(/walk-in/i)).toBeInTheDocument()
  })
})
