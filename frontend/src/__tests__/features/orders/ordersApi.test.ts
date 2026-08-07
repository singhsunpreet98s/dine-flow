// RTK Query constructs `new Request(url, opts)` before invoking a custom fetchFn.
// JSDOM v26 exposes Headers but NOT Request or Response — polyfill via node-fetch
// (always available as a transitive Jest dependency) before all imports.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFetch = require('node-fetch')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any
if (typeof g.Request === 'undefined') g.Request = nodeFetch.Request
if (typeof g.Response === 'undefined') g.Response = nodeFetch.Response

import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { baseApi } from '@/app/api'
import { ordersApi } from '@/features/orders/ordersApi'
import { OrderStatus, OrderChannel } from '@/types/enums'
import type { OrderDto } from '@/types/api'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Minimal store wired with the RTK Query baseApi middleware. */
function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  })
}

/**
 * Creates a self-contained test API with an injectable fetchFn so tests can
 * intercept HTTP calls without wrestling with Node.js native fetch capture.
 * Uses a fresh reducerPath ('testOrdersApi') so each call is fully isolated.
 */
function makeIsolatedApi(mockFetch: jest.Mock) {
  const api = createApi({
    reducerPath: 'testOrdersApi',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://localhost:44385/api/',
      fetchFn: mockFetch as unknown as typeof fetch,
    }),
    endpoints: (build) => ({
      getOrders: build.query<OrderDto[], void>({
        query: () => 'orders',
      }),
      updateOrderStatus: build.mutation<OrderDto, { id: string; status: OrderStatus }>({
        query: ({ id, status }) => ({
          url: `orders/${id}/status`,
          method: 'PATCH',
          body: { status },
        }),
      }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  })

  return { api, store }
}

/** Fake fetch response accepted by fetchBaseQuery's internal parsing. */
function makeFetchResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: jest.fn().mockReturnValue('application/json') },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    clone() {
      return this
    },
  }
}

// ── fixture ───────────────────────────────────────────────────────────────────

const mockOrder: OrderDto = {
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
  items: [],
  assignedWaiterId: null,
  assignedWaiterName: null,
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ordersApi', () => {
  it('getOrders endpoint is registered on the baseApi', () => {
    expect(ordersApi.endpoints.getOrders).toBeDefined()
  })

  it('getOrders endpoint exposes initiate and select', () => {
    expect(ordersApi.endpoints.getOrders.initiate).toBeInstanceOf(Function)
    expect(ordersApi.endpoints.getOrders.select).toBeInstanceOf(Function)
  })

  it('getOrders selector starts in uninitialized state', () => {
    const store = makeStore()
    // ordersApi shares the baseApi reducerPath — state is accessible via store.getState()
    const state = ordersApi.endpoints.getOrders.select()(store.getState())
    expect(state.status).toBe('uninitialized')
  })

  it('getOrders fetches from the orders path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse([mockOrder]))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getOrders.initiate())

    expect(mockFetch).toHaveBeenCalledTimes(1)
    // RTK Query passes a Request object (not a raw string) to fetchFn.
    const req = mockFetch.mock.calls[0][0] as { url: string }
    expect(req.url).toContain('orders')
  })

  it('getOrders stores the response payload in the RTK Query cache', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse([mockOrder]))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getOrders.initiate())
    // The fetch mock resolves synchronously but RTK Query dispatches 'fulfilled'
    // on the next micro-task tick — flush with setTimeout(0).
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const cached = api.endpoints.getOrders.select()(store.getState())
    expect(cached.status).toBe('fulfilled')
    expect(cached.data?.[0]?.orderNumber).toBe('ORD001')
  })

  it('updateOrderStatus sends a PATCH request to the orders/{id}/status path', async () => {
    const updatedOrder: OrderDto = { ...mockOrder, status: OrderStatus.SentToKitchen }
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(updatedOrder))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(
      api.endpoints.updateOrderStatus.initiate({ id: 'ord-1', status: OrderStatus.SentToKitchen }),
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string; method: string }
    expect(req.url).toContain('orders/ord-1/status')
    expect(req.method).toBe('PATCH')
  })
})
