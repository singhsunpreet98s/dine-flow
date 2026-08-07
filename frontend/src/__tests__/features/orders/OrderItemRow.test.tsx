import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OrderItemRow } from '@/features/orders/OrderItemRow'

// ── shared fixture ────────────────────────────────────────────────────────────

const baseItem = {
  menuItemId: 'menu-1',
  menuItemName: 'Butter Chicken',
  unitPrice: 250,
  quantity: 2,
  customizationNote: null as string | null,
}

/** Renders the row with sensible default no-op handlers. */
function renderRow(
  overrides: Partial<typeof baseItem> = {},
  handlers: {
    onQuantityChange?: (index: number, qty: number) => void
    onNoteChange?: (index: number, note: string) => void
    onRemove?: (index: number) => void
  } = {},
) {
  const item = { ...baseItem, ...overrides }
  return render(
    <OrderItemRow
      index={0}
      item={item}
      onQuantityChange={handlers.onQuantityChange ?? jest.fn()}
      onNoteChange={handlers.onNoteChange ?? jest.fn()}
      onRemove={handlers.onRemove ?? jest.fn()}
    />,
  )
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('OrderItemRow', () => {
  it('renders the item name', () => {
    renderRow()
    expect(screen.getByText('Butter Chicken')).toBeInTheDocument()
  })

  it('renders the unit price formatted to two decimal places', () => {
    renderRow()
    // Component renders "₹250.00 each" — match the numeric part.
    expect(screen.getByText(/250\.00/)).toBeInTheDocument()
  })

  it('renders the current quantity', () => {
    renderRow()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('plus button calls onQuantityChange with the incremented quantity', async () => {
    const user = userEvent.setup()
    const onQuantityChange = jest.fn()

    renderRow({}, { onQuantityChange })

    await user.click(screen.getByRole('button', { name: '+' }))

    expect(onQuantityChange).toHaveBeenCalledTimes(1)
    expect(onQuantityChange).toHaveBeenCalledWith(0, 3)
  })

  it('minus button calls onQuantityChange with the decremented quantity when qty > 1', async () => {
    const user = userEvent.setup()
    const onQuantityChange = jest.fn()

    renderRow({ quantity: 2 }, { onQuantityChange })

    // '&minus;' (HTML entity) renders as the Unicode minus sign U+2212
    await user.click(screen.getByRole('button', { name: /−/ }))

    expect(onQuantityChange).toHaveBeenCalledTimes(1)
    expect(onQuantityChange).toHaveBeenCalledWith(0, 1)
  })

  it('minus button is disabled when quantity is 1', () => {
    renderRow({ quantity: 1 })
    expect(screen.getByRole('button', { name: /−/ })).toBeDisabled()
  })

  it('remove button calls onRemove with the correct index', async () => {
    const user = userEvent.setup()
    const onRemove = jest.fn()

    renderRow({}, { onRemove })

    await user.click(screen.getByRole('button', { name: /remove/i }))

    expect(onRemove).toHaveBeenCalledTimes(1)
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('note input reflects the customizationNote value', () => {
    renderRow({ customizationNote: 'extra spicy' })
    expect(screen.getByPlaceholderText('Note (optional)')).toHaveValue('extra spicy')
  })

  it('note input is empty when customizationNote is null', () => {
    renderRow({ customizationNote: null })
    expect(screen.getByPlaceholderText('Note (optional)')).toHaveValue('')
  })

  it('note input calls onNoteChange when typed into', async () => {
    const user = userEvent.setup()
    const onNoteChange = jest.fn()

    renderRow({ customizationNote: null }, { onNoteChange })

    await user.type(screen.getByPlaceholderText('Note (optional)'), 'mild')

    // onChange fires once per character — verify it was called with the right args on the last keystroke
    expect(onNoteChange).toHaveBeenCalled()
    expect(onNoteChange).toHaveBeenLastCalledWith(0, expect.stringContaining('d'))
  })
})
