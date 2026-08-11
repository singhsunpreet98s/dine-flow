import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { EditOrderPage } from '@/pages/EditOrderPage'
import { authSlice, setCredentials } from '@/features/auth/authSlice'
import { baseApi } from '@/app/api'
import { OrderStatus, OrderChannel, UserRole } from '@/types/enums'
import type { OrderDto } from '@/types/api'
import { useGetOrderQuery, useAddItemsToOrderMutation } from '@/features/orders/ordersApi'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@microsoft/signalr')

jest.mock('@/features/orders/ordersApi', () => ({
  useGetOrderQuery: jest.fn(),
  useAddItemsToOrderMutation: jest.fn(),
}))

jest.mock('@/features/orders/MenuItemSearch', () => ({
  MenuItemSearch: () => <div data-testid="menu-item-search">MenuItemSearch</div>,
}))

jest.mock('@/features/orders/OrderItemRow', () => ({
  OrderItemRow: () => null,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStore() {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authSlice.reducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  })
  store.dispatch(
    setCredentials({ userId: 'u-1', name: 'Test', role: UserRole.Waiter, token: 'tok', isSetupComplete: true, timeZoneId: 'UTC' }),
  )
  return store
}

function makeOrder(status: OrderStatus): OrderDto {
  return {
    id: 'order-test-1',
    orderNumber: 'ORD-001',
    status,
    channel: OrderChannel.DineIn,
    restaurantTableId: null,
    customerName: 'Bob',
    notes: null,
    memberCount: 2,
    totalAmount: 200,
    paymentMode: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    items: [{ id: 'item-1', menuItemId: 'mi-1', menuItemName: 'Dosa', unitPrice: 100, quantity: 2, customizationNote: null }],
    assignedWaiterId: null,
    assignedWaiterName: null,
  }
}

function renderPage(order: OrderDto) {
  ;(useGetOrderQuery as jest.Mock).mockReturnValue({ data: order, isLoading: false, isError: false })
  ;(useAddItemsToOrderMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }])

  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[`/orders/${order.id}/edit`]}>
        <Routes>
          <Route path="/orders/:id/edit" element={<EditOrderPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditOrderPage — locked state (Paid / Closed)', () => {
  it('shows the locked banner when status is Paid', () => {
    renderPage(makeOrder(OrderStatus.Paid))
    expect(screen.getByText(/has been paid and can no longer be edited/i)).toBeInTheDocument()
  })

  it('shows the locked banner when status is Closed', () => {
    renderPage(makeOrder(OrderStatus.Closed))
    expect(screen.getByText(/has been paid and can no longer be edited/i)).toBeInTheDocument()
  })

  it('does not render the submit button when status is Paid', () => {
    renderPage(makeOrder(OrderStatus.Paid))
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('does not render the submit button when status is Closed', () => {
    renderPage(makeOrder(OrderStatus.Closed))
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument()
  })

  it('still shows the order summary (items) in the locked state', () => {
    renderPage(makeOrder(OrderStatus.Paid))
    expect(screen.getByText(/dosa/i)).toBeInTheDocument()
  })
})

describe('EditOrderPage — editable state (Preparing)', () => {
  it('renders the submit button when status is Preparing', () => {
    renderPage(makeOrder(OrderStatus.Preparing))
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('does not show the locked banner when status is Preparing', () => {
    renderPage(makeOrder(OrderStatus.Preparing))
    expect(screen.queryByText(/has been paid and can no longer be edited/i)).not.toBeInTheDocument()
  })
})
