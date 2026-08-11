import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { OrderCard } from '@/features/orders/OrderCard'
import { authSlice, setCredentials } from '@/features/auth/authSlice'
import { baseApi } from '@/app/api'
import { OrderStatus, OrderChannel, UserRole } from '@/types/enums'
import type { OrderDto } from '@/types/api'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@microsoft/signalr')

jest.mock('@/features/orders/ordersApi', () => ({
  useUpdateOrderStatusMutation: jest.fn(() => [jest.fn(), { isLoading: false }]),
  useGetUsersQuery: jest.fn(() => ({ data: [] })),
}))

jest.mock('@/hooks/useOrderTimer', () => ({
  useOrderTimer: () => ({ elapsed: 3, isDelayed: false }),
}))

jest.mock('@/features/orders/AssignWaiterButton', () => ({
  AssignWaiterButton: () => null,
}))

jest.mock('@/features/orders/PaymentDialog', () => ({
  PaymentDialog: () => null,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore(role: UserRole) {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authSlice.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  })
  store.dispatch(
    setCredentials({ userId: 'u-1', name: 'Test User', role, token: 'tok', isSetupComplete: true, timeZoneId: 'UTC' }),
  )
  return store
}

function makeOrder(status: OrderStatus): OrderDto {
  return {
    id: 'order-1',
    orderNumber: 'ORD-TEST-001',
    status,
    channel: OrderChannel.DineIn,
    restaurantTableId: null,
    customerName: 'Alice',
    notes: null,
    memberCount: 2,
    totalAmount: 150,
    paymentMode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [],
    assignedWaiterId: null,
    assignedWaiterName: null,
  }
}

function renderCard(order: OrderDto, role: UserRole) {
  const store = makeStore(role)
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <OrderCard order={order} />
      </MemoryRouter>
    </Provider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OrderCard — Edit link visibility', () => {
  it('hides Edit link when status is Paid (Waiter)', () => {
    renderCard(makeOrder(OrderStatus.Paid), UserRole.Waiter)
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('hides Edit link when status is Closed (Manager)', () => {
    renderCard(makeOrder(OrderStatus.Closed), UserRole.Manager)
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })

  it('shows Edit link when status is Preparing (Waiter)', () => {
    renderCard(makeOrder(OrderStatus.Preparing), UserRole.Waiter)
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('shows Edit link when status is Billed (Manager)', () => {
    renderCard(makeOrder(OrderStatus.Billed), UserRole.Manager)
    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument()
  })

  it('hides Edit link for Kitchen role regardless of status', () => {
    renderCard(makeOrder(OrderStatus.Preparing), UserRole.Kitchen)
    expect(screen.queryByRole('link', { name: /edit/i })).not.toBeInTheDocument()
  })
})
