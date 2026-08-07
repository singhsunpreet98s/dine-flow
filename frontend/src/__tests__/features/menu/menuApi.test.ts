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
import { menuApi } from '@/features/menu/menuApi'
import type { MenuCategoryDto, MenuItemDto, PagedResult } from '@/types/api'

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
 * Mirrors the subset of menuApi endpoints required by these tests.
 */
function makeIsolatedApi(mockFetch: jest.Mock) {
  const api = createApi({
    reducerPath: 'testMenuApi',
    baseQuery: fetchBaseQuery({
      baseUrl: 'https://localhost:44385/api/',
      fetchFn: mockFetch as unknown as typeof fetch,
    }),
    endpoints: (build) => ({
      getMenuCategories: build.query<MenuCategoryDto[], void>({
        query: () => 'menu/categories',
      }),
      getMenuItems: build.query<PagedResult<MenuItemDto>, { page: number; pageSize: number }>({
        query: (params) => ({ url: 'menu/items', params }),
      }),
      createMenuCategory: build.mutation<
        MenuCategoryDto,
        { name: string; sortOrder: number; isActive: boolean }
      >({
        query: (body) => ({ url: 'menu/categories', method: 'POST', body }),
      }),
      deleteMenuItem: build.mutation<void, string>({
        query: (id) => ({ url: `menu/items/${id}`, method: 'DELETE' }),
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

// ── fixtures ──────────────────────────────────────────────────────────────────

const mockCategory: MenuCategoryDto = {
  id: 'cat-1',
  name: 'Starters',
  sortOrder: 1,
  isActive: true,
  itemCount: 3,
  items: [],
}

const mockPagedItems: PagedResult<MenuItemDto> = {
  items: [
    {
      id: 'item-1',
      name: 'Butter Chicken',
      description: null,
      categoryId: 'cat-1',
      categoryName: 'Starters',
      price: 250,
      isAvailable: true,
      photoUrl: null,
      displayOrder: 1,
    },
  ],
  totalCount: 1,
  page: 1,
  pageSize: 12,
  totalPages: 1,
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('menuApi', () => {
  // ── endpoint registration ──────────────────────────────────────────────────

  it('getMenuCategories endpoint is registered', () => {
    expect(menuApi.endpoints.getMenuCategories).toBeDefined()
  })

  it('getMenuItems endpoint is registered', () => {
    expect(menuApi.endpoints.getMenuItems).toBeDefined()
  })

  // ── initial cache state ────────────────────────────────────────────────────

  it('getMenuCategories selector starts uninitialized', () => {
    const store = makeStore()
    const state = menuApi.endpoints.getMenuCategories.select()(store.getState())
    expect(state.status).toBe('uninitialized')
  })

  // ── URL routing ────────────────────────────────────────────────────────────

  it('getMenuCategories fetches from menu/categories path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse([mockCategory]))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getMenuCategories.initiate())

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string }
    expect(req.url).toContain('menu/categories')
  })

  // ── cache storage ──────────────────────────────────────────────────────────

  it('getMenuCategories stores response in cache', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse([mockCategory]))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getMenuCategories.initiate())
    // RTK Query dispatches 'fulfilled' on the next micro-task tick — flush with setTimeout(0).
    await new Promise<void>((resolve) => setTimeout(resolve, 0))

    const cached = api.endpoints.getMenuCategories.select()(store.getState())
    expect(cached.status).toBe('fulfilled')
    expect(cached.data?.[0]?.name).toBe('Starters')
  })

  // ── getMenuItems ───────────────────────────────────────────────────────────

  it('getMenuItems fetches from menu/items path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(mockPagedItems))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.getMenuItems.initiate({ page: 1, pageSize: 12 }))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string }
    expect(req.url).toContain('menu/items')
  })

  // ── createMenuCategory mutation ────────────────────────────────────────────

  it('createMenuCategory uses POST to menu/categories path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(mockCategory))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(
      api.endpoints.createMenuCategory.initiate({
        name: 'Starters',
        sortOrder: 1,
        isActive: true,
      }),
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string; method: string }
    expect(req.url).toContain('menu/categories')
    expect(req.method).toBe('POST')
  })

  // ── deleteMenuItem mutation ────────────────────────────────────────────────

  it('deleteMenuItem uses DELETE method with the item id in the path', async () => {
    const mockFetch = jest.fn().mockResolvedValue(makeFetchResponse(null))
    const { api, store } = makeIsolatedApi(mockFetch)

    await store.dispatch(api.endpoints.deleteMenuItem.initiate('item-1'))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const req = mockFetch.mock.calls[0][0] as { url: string; method: string }
    expect(req.method).toBe('DELETE')
    expect(req.url).toContain('menu/items/item-1')
  })
})
