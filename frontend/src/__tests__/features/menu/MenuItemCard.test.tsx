import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MenuItemCard } from '@/features/menu/components/MenuItemCard'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import {
  useDeleteMenuItemMutation,
  useToggleMenuItemAvailabilityMutation,
} from '@/features/menu/menuApi'
import type { MenuItemDto } from '@/types/api'

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/hooks/useRoleGuard', () => ({
  useRoleGuard: jest.fn(),
}))

jest.mock('@/features/menu/menuApi', () => ({
  useDeleteMenuItemMutation: jest.fn(),
  useToggleMenuItemAvailabilityMutation: jest.fn(),
}))

// Replace the dialog with a null stub — we test its trigger, not its internals.
jest.mock('@/features/menu/components/DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}))

// ── fixture ───────────────────────────────────────────────────────────────────

const baseItem: MenuItemDto = {
  id: 'item-1',
  name: 'Butter Chicken',
  description: 'Creamy tomato-based curry',
  categoryId: 'cat-1',
  categoryName: 'Mains',
  price: 280,
  isAvailable: true,
  photoUrl: null,
  displayOrder: 1,
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a mutation fn that returns { unwrap } so async handlers don't throw. */
function makeMutationFn() {
  return jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue(undefined) })
}

function renderCard(item: Partial<MenuItemDto> = {}, onEdit = jest.fn()) {
  return render(<MenuItemCard item={{ ...baseItem, ...item }} onEdit={onEdit} />)
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  // Default: Admin + Manager — both role guards return true.
  ;(useRoleGuard as jest.Mock).mockReturnValue(true)
  ;(useDeleteMenuItemMutation as jest.Mock).mockReturnValue([makeMutationFn(), { isLoading: false }])
  ;(useToggleMenuItemAvailabilityMutation as jest.Mock).mockReturnValue([
    makeMutationFn(),
    { isLoading: false },
  ])
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('MenuItemCard', () => {
  // ── core content ────────────────────────────────────────────────────────────

  it('renders the item name', () => {
    renderCard()
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument()
  })

  it('renders the category name', () => {
    renderCard()
    expect(screen.getByText('Mains')).toBeInTheDocument()
  })

  it('renders the price', () => {
    renderCard()
    expect(screen.getByText(/280\.00/)).toBeInTheDocument()
  })

  it('renders the description', () => {
    renderCard()
    expect(screen.getByText(/creamy tomato/i)).toBeInTheDocument()
  })

  // ── availability badge ───────────────────────────────────────────────────────

  it('renders Available badge when isAvailable is true', () => {
    renderCard()
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('renders Unavailable badge when isAvailable is false', () => {
    renderCard({ isAvailable: false })
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
  })

  // ── photo / placeholder ──────────────────────────────────────────────────────

  it('renders placeholder emoji when photoUrl is null', () => {
    renderCard({ photoUrl: null })
    expect(screen.getByText(/🍽/)).toBeInTheDocument()
  })

  it('renders img when photoUrl is set', () => {
    renderCard({ photoUrl: 'https://cdn.example.com/img.jpg' })
    expect(screen.getByRole('img', { name: /butter chicken/i })).toBeInTheDocument()
  })

  // ── toggle button ────────────────────────────────────────────────────────────

  it('toggle button is rendered for Admin/Manager', () => {
    // Default beforeEach: useRoleGuard returns true for both isAdmin and canToggle.
    renderCard()
    expect(screen.getByRole('button', { name: /toggle availability/i })).toBeInTheDocument()
  })

  it('toggle button is not rendered for non-Admin/non-Manager', () => {
    // Returning false for every useRoleGuard call disables both isAdmin and canToggle.
    ;(useRoleGuard as jest.Mock).mockReturnValue(false)
    renderCard()
    expect(screen.queryByRole('button', { name: /toggle availability/i })).not.toBeInTheDocument()
  })

  it('clicking toggle button calls the mutation', async () => {
    const mockToggle = makeMutationFn()
    ;(useToggleMenuItemAvailabilityMutation as jest.Mock).mockReturnValue([
      mockToggle,
      { isLoading: false },
    ])

    renderCard()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /toggle availability/i }))

    expect(mockToggle).toHaveBeenCalledWith('item-1')
  })

  // ── edit button ──────────────────────────────────────────────────────────────

  it('clicking the edit button calls onEdit with the item', async () => {
    const mockOnEdit = jest.fn()
    renderCard({}, mockOnEdit)

    const user = userEvent.setup()
    // The Shadcn Button has title="Edit item" — its accessible name derives from title.
    await user.click(screen.getByRole('button', { name: 'Edit item' }))

    expect(mockOnEdit).toHaveBeenCalledWith(baseItem)
  })
})
