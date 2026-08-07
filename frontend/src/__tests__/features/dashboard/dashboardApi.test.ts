// RTK Query calls `new Request(url, opts)` before invoking a custom fetchFn.
// JSDOM v26 exposes Headers but not Request — polyfill with node-fetch which
// is always available as a transitive Jest dependency.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nodeFetch = require('node-fetch')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = global as any
if (typeof g.Request === 'undefined') g.Request = nodeFetch.Request
if (typeof g.Response === 'undefined') g.Response = nodeFetch.Response

import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { baseApi } from '@/app/api'
import { dashboardApi } from '@/features/dashboard/dashboardApi'
import type { DashboardStatsDto } from '@/features/dashboard/dashboardTypes'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Minimal store wired with the RTK Query baseApi middleware. */
function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  })
}

/**
 * Creates a self-contained test API that uses an injectable `fetchFn` so tests
 * can intercept the HTTP call without wrestling with Node.js' native fetch capture.
 */
function makeIsolatedApi(mockFetch: jest.Mock) {
  const api = createApi({
    reducerPath: 'testDashboardApi',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://localhost:44385/api/',
      // fetchFn injects our mock — bypasses the module-level native fetch capture
      fetchFn: mockFetch as unknown as typeof fetch,
    }),
    endpoints: (build) => ({
      getDashboardStats: build.query<DashboardStatsDto, void>({
        query: () => 'dashboard/stats',
      }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  })

  return { api, store }
}

const emptyStats: DashboardStatsDto = {
  totalOrders: 0,
  todayOrders: 0,
  pendingOrders: 0,
  delayedOrders: 0,
  dailyAverage: 0,
  todayIncome: 0,
  tablesOccupied: 0,
  totalTables: 0,
  cancelledOrders: 0,
  dailyOrders: [],
  incomeByMode: [],
  ordersByChannel: [],
  topItems: [],
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('dashboardApi', () => {
  it('getDashboardStats endpoint is registered on the baseApi', () => {
    expect(dashboardApi.endpoints.getDashboardStats).toBeDefined()
  })

  it('getDashboardStats endpoint exposes initiate and select', () => {
    expect(dashboardApi.endpoints.getDashboardStats.initiate).toBeInstanceOf(Function)
    expect(dashboardApi.endpoints.getDashboardStats.select).toBeInstanceOf(Function)
  })

  it('getDashboardStats selector starts in uninitialized state', () => {
    const store = makeStore()
    const state = dashboardApi.endpoints.getDashboardStats.select()(store.getState())
    expect(state.status).toBe('uninitialized')
  })

  it('getDashboardStats dispatches a fetch to the dashboard/stats path', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue(JSON.stringify(emptyStats)),
      clone() { return this },
    })

    const { api, store } = makeIsolatedApi(mockFetch)
    await store.dispatch(api.endpoints.getDashboardStats.initiate())

    // RTK Query passes a Request object (not a raw string) to fetchFn.
    // The URL is accessible via the standard .url property.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const calledWith = mockFetch.mock.calls[0][0] as { url: string }
    expect(calledWith.url).toContain('dashboard/stats')
  })

  it('getDashboardStats stores the response payload in the RTK Query cache', async () => {
    const payload: DashboardStatsDto = { ...emptyStats, totalOrders: 42, todayIncome: 1500 }

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: jest.fn().mockReturnValue('application/json') },
      text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
      clone() { return this },
    })

    const { api, store } = makeIsolatedApi(mockFetch)

    // Dispatch the query and flush RTK Query's async middleware pipeline.
    // The fetch mock resolves synchronously but RTK Query dispatches its
    // 'fulfilled' action on the next micro-task tick — setTimeout(0) drains it.
    await store.dispatch(api.endpoints.getDashboardStats.initiate())
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const cached = api.endpoints.getDashboardStats.select()(store.getState())
    expect(cached.status).toBe('fulfilled')
    expect(cached.data?.totalOrders).toBe(42)
    expect(cached.data?.todayIncome).toBe(1500)
  })
})
