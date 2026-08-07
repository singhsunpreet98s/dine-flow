import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuPage } from '@/pages/MenuPage'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import {
  useGetMenuCategoriesQuery,
  useGetMenuItemsQuery,
  useDeleteMenuCategoryMutation,
} from '@/features/menu/menuApi'
import { setSelectedCategory } from '@/features/menu/menuSlice'

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/app/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}))

jest.mock('@/hooks/useRoleGuard', () => ({
  useRoleGuard: jest.fn(),
}))

jest.mock('@/features/menu/menuApi', () => ({
  useGetMenuCategoriesQuery: jest.fn(),
  useGetMenuItemsQuery: jest.fn(),
  useDeleteMenuCategoryMutation: jest.fn(),
}))

// Replace heavy sub-components with lightweight stubs so this test focuses
// entirely on MenuPage layout, state handling, and dispatch behaviour.
jest.mock('@/features/menu/components/MenuItemCard', () => ({
  MenuItemCard: ({ item }: { item: { name: string } }) => (
    <div data-testid="menu-item-card">{item.name}</div>
  ),
}))

jest.mock('@/features/menu/components/MenuItemSheet', () => ({
  MenuItemSheet: () => null,
}))

jest.mock('@/features/menu/components/MenuCategorySheet', () => ({
  MenuCategorySheet: () => null,
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

const mockCategories = [
  { id: 'cat-1', name: 'Starters', sortOrder: 1, isActive: true, itemCount: 2, items: [] },
  { id: 'cat-2', name: 'Mains', sortOrder: 2, isActive: true, itemCount: 5, items: [] },
]

const mockPagedResult = {
  items: [
    {
      id: 'item-1',
      name: 'Butter Chicken',
      description: null,
      categoryId: 'cat-1',
      categoryName: 'Starters',
      price: 280,
      isAvailable: true,
      photoUrl: null,
      displayOrder: 1,
    },
    {
      id: 'item-2',
      name: 'Dal Makhani',
      description: null,
      categoryId: 'cat-1',
      categoryName: 'Starters',
      price: 180,
      isAvailable: false,
      photoUrl: null,
      displayOrder: 2,
    },
  ],
  totalCount: 2,
  page: 1,
  pageSize: 12,
  totalPages: 1,
}

// ── setup ─────────────────────────────────────────────────────────────────────

// Stable dispatch mock captured at describe scope so interaction tests can assert on it.
const mockDispatch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()

  // useAppDispatch returns the stable mockDispatch reference.
  ;(useAppDispatch as jest.Mock).mockReturnValue(mockDispatch)

  // Simulate the Redux store slice for menu + auth.
  ;(useAppSelector as jest.Mock).mockImplementation(
    (selector: (s: unknown) => unknown) =>
      selector({
        menu: { selectedCategoryId: null, searchTerm: '', currentPage: 1 },
        auth: { role: 'Admin' },
      }),
  )

  // Default: Admin role — show all admin controls.
  ;(useRoleGuard as jest.Mock).mockReturnValue(true)

  ;(useGetMenuCategoriesQuery as jest.Mock).mockReturnValue({ data: mockCategories })
  ;(useGetMenuItemsQuery as jest.Mock).mockReturnValue({
    data: mockPagedResult,
    isLoading: false,
    isError: false,
  })
  ;(useDeleteMenuCategoryMutation as jest.Mock).mockReturnValue([jest.fn(), {}])
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('MenuPage', () => {
  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the page heading', () => {
    render(<MenuPage />)
    expect(screen.getByRole('heading', { name: /menu/i })).toBeInTheDocument()
  })

  it('renders the search input', () => {
    render(<MenuPage />)
    expect(screen.getByPlaceholderText(/search menu items/i)).toBeInTheDocument()
  })

  it('renders category filter pills', () => {
    render(<MenuPage />)
    // Category names appear inside buttons that also contain the item-count span,
    // so we use regex to match the name portion of the button text.
    expect(screen.getByText(/^Starters/)).toBeInTheDocument()
    expect(screen.getByText(/^Mains/)).toBeInTheDocument()
  })

  it('renders All category pill', () => {
    render(<MenuPage />)
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('renders menu item cards for each item', () => {
    render(<MenuPage />)
    expect(screen.getAllByTestId('menu-item-card')).toHaveLength(2)
  })

  it('renders item names in cards', () => {
    render(<MenuPage />)
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument()
    expect(screen.getByText('Dal Makhani')).toBeInTheDocument()
  })

  it('admin action buttons are rendered for Admin role', () => {
    // For Admin (useRoleGuard=true) with 2 categories and no pagination:
    //   Filter buttons : "All" + "Starters" + "Mains"            = 3
    //   Category-edit  : pencil for each category (admin only)   = 2
    //   Header actions : Add Category + Add Item (admin only)     = 2
    //                                                        Total = 7
    render(<MenuPage />)
    expect(screen.getAllByRole('button')).toHaveLength(7)
  })

  it('no admin action buttons rendered for non-Admin role', () => {
    // For non-Admin (useRoleGuard=false) with 2 categories and no pagination:
    //   Filter buttons : "All" + "Starters" + "Mains" = 3
    //   (no pencil / header buttons)              Total = 3
    ;(useRoleGuard as jest.Mock).mockReturnValue(false)
    render(<MenuPage />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  // ── States ────────────────────────────────────────────────────────────────

  it('shows loading spinner when isLoading is true', () => {
    ;(useGetMenuItemsQuery as jest.Mock).mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
    })
    render(<MenuPage />)
    // The spinner replaces the items grid — no item cards should exist.
    expect(screen.queryAllByTestId('menu-item-card')).toHaveLength(0)
  })

  it('shows error message when isError is true', () => {
    ;(useGetMenuItemsQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
    })
    render(<MenuPage />)
    expect(screen.getByText(/failed to load menu items/i)).toBeInTheDocument()
  })

  it('shows empty state message when no items', () => {
    ;(useGetMenuItemsQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...mockPagedResult, items: [], totalCount: 0 },
    })
    render(<MenuPage />)
    // searchTerm and selectedCategoryId are both null in mock state, so the
    // generic "no items yet" message is shown rather than the filter message.
    expect(screen.getByText(/no menu items yet/i)).toBeInTheDocument()
  })

  it('shows pagination when totalPages > 1', () => {
    ;(useGetMenuItemsQuery as jest.Mock).mockReturnValue({
      isLoading: false,
      isError: false,
      data: { ...mockPagedResult, totalPages: 3 },
    })
    render(<MenuPage />)
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
  })

  it('does not show pagination when totalPages is 1', () => {
    // Default mock has totalPages: 1.
    render(<MenuPage />)
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument()
  })

  // ── Interaction ───────────────────────────────────────────────────────────

  it('search input value updates when user types', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)

    const input = screen.getByPlaceholderText(/search menu items/i)
    await user.type(input, 'chicken')

    expect((input as HTMLInputElement).value).toBe('chicken')
  })

  it('category pill click dispatches setSelectedCategory', async () => {
    const user = userEvent.setup()
    render(<MenuPage />)

    // The "Starters" category pill is a button whose accessible name includes
    // the category name; click it and verify the Redux action was dispatched.
    await user.click(screen.getByRole('button', { name: /^Starters/ }))

    expect(mockDispatch).toHaveBeenCalledWith(setSelectedCategory('cat-1'))
  })
})
