import {
  uiSlice,
  toggleSidebar,
  setSidebarOpen,
  setTheme,
  setAccentColor,
  setActiveOrder,
} from '@/features/ui/uiSlice'

// ── localStorage mock ─────────────────────────────────────────────────────────
// The slice's setTheme and setAccentColor reducers call localStorage.setItem.
// We replace window.localStorage with a controlled in-memory store so we can
// assert persistence behaviour without touching the real JSDOM storage.

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem:    (key: string) => store[key] ?? null,
    setItem:    (key: string, value: string) => { store[key] = value },
    clear:      () => { store = {} },
    removeItem: (key: string) => { delete store[key] },
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true, writable: true })

// ── setup ─────────────────────────────────────────────────────────────────────

const reducer = uiSlice.reducer

// Clear the in-memory store before each test so localStorage state cannot leak
// between tests. The slice module is cached by Jest, so we cannot re-run the
// module-level loadUiPrefs(); instead we verify only actions, not initial hydration.
beforeEach(() => {
  localStorageMock.clear()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('uiSlice', () => {
  // ── initial state ──────────────────────────────────────────────────────────

  it('initial state has sidebarOpen true', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.sidebarOpen).toBe(true)
  })

  it('initial state has theme light', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.theme).toBe('light')
  })

  it('initial state has accentColor blue', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.accentColor).toBe('blue')
  })

  // ── toggleSidebar ──────────────────────────────────────────────────────────

  it('toggleSidebar flips sidebarOpen from true to false', () => {
    // Default initial state has sidebarOpen: true
    const state = reducer(undefined, toggleSidebar())
    expect(state.sidebarOpen).toBe(false)
  })

  it('toggleSidebar flips sidebarOpen from false to true', () => {
    const withClosed = reducer(undefined, setSidebarOpen(false))
    const state = reducer(withClosed, toggleSidebar())
    expect(state.sidebarOpen).toBe(true)
  })

  // ── setSidebarOpen ─────────────────────────────────────────────────────────

  it('setSidebarOpen sets sidebarOpen to the given value', () => {
    const closed = reducer(undefined, setSidebarOpen(false))
    expect(closed.sidebarOpen).toBe(false)

    const opened = reducer(closed, setSidebarOpen(true))
    expect(opened.sidebarOpen).toBe(true)
  })

  // ── setTheme ───────────────────────────────────────────────────────────────

  it('setTheme sets theme to dark', () => {
    const state = reducer(undefined, setTheme('dark'))
    expect(state.theme).toBe('dark')
  })

  it('setTheme sets theme to light', () => {
    const withDark = reducer(undefined, setTheme('dark'))
    const state = reducer(withDark, setTheme('light'))
    expect(state.theme).toBe('light')
  })

  it('setTheme persists theme to localStorage', () => {
    reducer(undefined, setTheme('dark'))
    const stored = JSON.parse(localStorageMock.getItem('dineflow_ui') ?? '{}') as {
      theme: string
      accentColor: string
    }
    expect(stored.theme).toBe('dark')
  })

  // ── setAccentColor ─────────────────────────────────────────────────────────

  it('setAccentColor sets accentColor to rose', () => {
    const state = reducer(undefined, setAccentColor('rose'))
    expect(state.accentColor).toBe('rose')
  })

  it('setAccentColor persists accentColor to localStorage', () => {
    reducer(undefined, setAccentColor('rose'))
    const stored = JSON.parse(localStorageMock.getItem('dineflow_ui') ?? '{}') as {
      theme: string
      accentColor: string
    }
    expect(stored.accentColor).toBe('rose')
  })

  // ── setActiveOrder ─────────────────────────────────────────────────────────

  it('setActiveOrder sets activeOrderId', () => {
    const state = reducer(undefined, setActiveOrder('order-123'))
    expect(state.activeOrderId).toBe('order-123')
  })

  it('setActiveOrder accepts null to clear activeOrderId', () => {
    const withOrder = reducer(undefined, setActiveOrder('order-123'))
    const state = reducer(withOrder, setActiveOrder(null))
    expect(state.activeOrderId).toBeNull()
  })
})
