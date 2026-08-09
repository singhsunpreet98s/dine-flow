import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// DF-7: Verify SelectContent carries the bg-popover class so the dropdown
// panel has a solid background.  JSDOM does not process CSS, so we assert on
// the class name rather than computed styles — this confirms Tailwind will
// generate the rule when the `popover` color token is present in tailwind.config.

// JSDOM does not implement Pointer Events API or scrollIntoView — polyfill the
// methods that Radix UI's Select calls during open/scroll interactions.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = jest.fn(() => false)
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = jest.fn()
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = jest.fn()
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = jest.fn()
  }
})

// Helper — renders a Select in a closed state
function renderSelect() {
  return render(
    <Select>
      <SelectTrigger aria-label="Pick an option">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
        <SelectItem value="b">Option B</SelectItem>
        <SelectItem value="c">Option C</SelectItem>
      </SelectContent>
    </Select>,
  )
}

// Helper — renders a Select pre-opened via defaultOpen so we can inspect the
// portal content without triggering pointer-event flows that JSDOM does not support.
function renderOpenSelect() {
  return render(
    <Select defaultOpen>
      <SelectTrigger aria-label="Pick an option">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
        <SelectItem value="b">Option B</SelectItem>
        <SelectItem value="c">Option C</SelectItem>
      </SelectContent>
    </Select>,
  )
}

describe('Select (Shadcn / Radix)', () => {
  it('renders the trigger as a combobox', () => {
    renderSelect()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('shows placeholder text before a selection is made', () => {
    renderSelect()
    expect(screen.getByText('Select…')).toBeInTheDocument()
  })

  // DF-7 core assertion: the dropdown panel must carry bg-popover so Tailwind
  // generates a solid background-color rule, preventing content bleed-through.
  it('SelectContent has bg-popover class (ensures solid dropdown background)', () => {
    renderOpenSelect()
    // Radix renders SelectContent as a listbox — query it directly.
    const content = screen.getByRole('listbox')
    expect(content).toBeInTheDocument()
    expect(content).toHaveClass('bg-popover')
  })

  it('renders all items when the dropdown is open', () => {
    renderOpenSelect()
    expect(screen.getByRole('option', { name: 'Option A' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option B' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Option C' })).toBeInTheDocument()
  })

  it('updates the trigger value after selecting an option', async () => {
    const user = userEvent.setup()
    renderOpenSelect()

    await user.click(screen.getByRole('option', { name: 'Option A' }))

    expect(screen.getByText('Option A')).toBeInTheDocument()
  })
})
