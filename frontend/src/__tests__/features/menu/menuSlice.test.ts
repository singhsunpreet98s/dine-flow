import { menuSlice, setSelectedCategory, setSearchTerm, setCurrentPage } from '@/features/menu/menuSlice'

const reducer = menuSlice.reducer

// ── tests ─────────────────────────────────────────────────────────────────────

describe('menuSlice', () => {
  // ── initial state ──────────────────────────────────────────────────────────

  it('initial state has selectedCategoryId null', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.selectedCategoryId).toBeNull()
  })

  it('initial state has searchTerm empty string', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.searchTerm).toBe('')
  })

  it('initial state has currentPage 1', () => {
    const state = reducer(undefined, { type: '' })
    expect(state.currentPage).toBe(1)
  })

  // ── setSelectedCategory ────────────────────────────────────────────────────

  it('setSelectedCategory sets the id', () => {
    const state = reducer(undefined, setSelectedCategory('cat-1'))
    expect(state.selectedCategoryId).toBe('cat-1')
  })

  it('setSelectedCategory resets currentPage to 1', () => {
    // Start at page 3, then change category — page must snap back to 1.
    let state = reducer(undefined, setCurrentPage(3))
    state = reducer(state, setSelectedCategory('cat-1'))
    expect(state.currentPage).toBe(1)
  })

  it('setSelectedCategory accepts null to clear selection', () => {
    let state = reducer(undefined, setSelectedCategory('cat-1'))
    state = reducer(state, setSelectedCategory(null))
    expect(state.selectedCategoryId).toBeNull()
  })

  // ── setSearchTerm ──────────────────────────────────────────────────────────

  it('setSearchTerm sets the search term', () => {
    const state = reducer(undefined, setSearchTerm('pizza'))
    expect(state.searchTerm).toBe('pizza')
  })

  it('setSearchTerm resets currentPage to 1', () => {
    // Start at page 5, then change search term — page must snap back to 1.
    let state = reducer(undefined, setCurrentPage(5))
    state = reducer(state, setSearchTerm('chicken'))
    expect(state.currentPage).toBe(1)
  })

  // ── setCurrentPage ─────────────────────────────────────────────────────────

  it('setCurrentPage sets currentPage to given value', () => {
    const state = reducer(undefined, setCurrentPage(4))
    expect(state.currentPage).toBe(4)
  })
})
