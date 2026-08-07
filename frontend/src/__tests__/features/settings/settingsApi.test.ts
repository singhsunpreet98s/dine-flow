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
import { settingsApi } from '@/features/settings/settingsApi'
import type { SettingsDto } from '@/types/api'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Minimal store wired with the RTK Query baseApi middleware. */
function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  })
}

/**
 * Creates a self-contained test API with all three settings endpoints.
 * Uses an injectable fetchFn so tests can intercept HTTP calls without
 * wrestling with Node.js' native fetch capture.
 */
function makeIsolatedApi(mockFetch: jest.Mock) {
  const api = createApi({
    reducerPath: 'testSettingsApi',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://localhost:44385/api/',
      // fetchFn injects our mock — bypasses the module-level native fetch capture
      fetchFn: mockFetch as unknown as typeof fetch,
    }),
    endpoints: (build) => ({
      getSettings: build.query<SettingsDto, void>({
        query: () => 'settings',
      }),
      updateSettings: build.mutation<SettingsDto, Partial<SettingsDto>>({
        query: (body) => ({ url: 'settings', method: 'PATCH', body }),
      }),
      uploadLogo: build.mutation<{ logoUrl: string }, FormData>({
        query: (formData) => ({ url: 'settings/logo', method: 'POST', body: formData }),
      }),
    }),
  })

  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  })

  return { api, store }
}

// ── mock payloads ─────────────────────────────────────────────────────────────

const mockSettings: SettingsDto = {
  name: 'Spice Garden',
  themeAccentColor: 'blue',
  logoUrl: null,
  gstRate: 5,
}

/**
 * Returns a fetch-compatible mock response without constructing a real
 * `Response` object — avoids JSDOM/node-fetch `Response` constructor issues.
 */
function makeFetchResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: jest.fn().mockReturnValue('application/json') },
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    clone() { return this },
  }
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('settingsApi', () => {
  it('getSettings endpoint is registered on the baseApi', () => {
    expect(settingsApi.endpoints.getSettings).toBeDefined()
  })

  it('getSettings endpoint exposes initiate and select', () => {
    expect(settingsApi.endpoints.getSettings.initiate).toBeInstanceOf(Function)
    expect(settingsApi.endpoints.getSettings.select).toBeInstanceOf(Function)
  })

  it('getSettings selector starts in uninitialized state', () => {
    const store = makeStore()
    const state = settingsApi.endpoints.getSettings.select()(store.getState())
    expect(state.status).toBe('uninitialized')
  })

  it('getSettings fetches from the settings path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(mockSettings))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getSettings.initiate())

    // RTK Query passes a Request object (not a raw string) to fetchFn.
    // The URL is accessible via the standard .url property.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string }
    expect(req.url).toContain('settings')
  })

  it('getSettings stores response in RTK Query cache', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(mockSettings))
    const { api, store } = makeIsolatedApi(mockFetch)

    // Dispatch the query and flush RTK Query's async middleware pipeline.
    // The fetch mock resolves synchronously but RTK Query dispatches its
    // 'fulfilled' action on the next micro-task tick — setTimeout(0) drains it.
    await store.dispatch(api.endpoints.getSettings.initiate())
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const cached = api.endpoints.getSettings.select()(store.getState())
    expect(cached.status).toBe('fulfilled')
    expect(cached.data?.name).toBe('Spice Garden')
    expect(cached.data?.gstRate).toBe(5)
  })

  it('updateSettings uses PATCH to the settings path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(mockSettings))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.updateSettings.initiate({ name: 'New Name' }))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string; method: string }
    expect(req.url).toContain('settings')
    expect(req.method).toBe('PATCH')
  })

  it('uploadLogo uses POST to the settings/logo path', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValue(makeFetchResponse({ logoUrl: 'https://cdn.example.com/logo.png' }))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.uploadLogo.initiate(new FormData()))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string; method: string }
    expect(req.url).toContain('settings/logo')
    expect(req.method).toBe('POST')
  })
})
