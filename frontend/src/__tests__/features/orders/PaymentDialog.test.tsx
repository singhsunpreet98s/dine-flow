import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentDialog } from '@/features/orders/PaymentDialog'
import type { PaymentDialogValues } from '@/features/orders/orderSchemas'

// PaymentDialog is always visible when mounted — the parent (OrderCard)
// conditionally renders it.  There is no `open` prop.

const defaultProps = {
  orderNumber: 'ORD001',
  totalAmount: 450,
  isLoading: false,
  onConfirm: jest.fn<Promise<void>, [PaymentDialogValues]>(),
  onCancel: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('PaymentDialog', () => {
  it('renders the dialog heading', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText('Mark as Paid')).toBeInTheDocument()
  })

  it('renders the order number', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByText(/ORD001/)).toBeInTheDocument()
  })

  it('renders the total amount', () => {
    render(<PaymentDialog {...defaultProps} />)
    // Component formats: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
    expect(screen.getByText(/450/)).toBeInTheDocument()
  })

  it('cancel button calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(<PaymentDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('close (×) button calls onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()

    render(<PaymentDialog {...defaultProps} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('shows a validation error when submitting without selecting a payment mode', async () => {
    const user = userEvent.setup()

    render(<PaymentDialog {...defaultProps} onConfirm={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: /confirm payment/i }))

    await waitFor(() => {
      // FormField renders error as <p>{error}</p> — paymentDialogSchema message is
      // "Please select a payment mode"
      expect(screen.getByText('Please select a payment mode')).toBeInTheDocument()
    })
  })

  it('confirm button does not call onConfirm when no payment mode is selected', async () => {
    const user = userEvent.setup()
    const onConfirm = jest.fn()

    render(<PaymentDialog {...defaultProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: /confirm payment/i }))

    // Give RHF time to process the submission attempt
    await waitFor(() => {
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  it('shows a loading spinner and disables buttons when isLoading is true', () => {
    render(<PaymentDialog {...defaultProps} isLoading={true} />)

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()

    // When isLoading the submit button renders only a spinner SVG (aria-hidden),
    // so it has no accessible name.  Find it by its type attribute instead.
    const submitButton = screen.getAllByRole('button').find(
      (btn) => (btn as HTMLButtonElement).type === 'submit',
    )
    expect(submitButton).toBeDefined()
    expect(submitButton).toBeDisabled()
  })

  it('renders the payment mode select trigger', () => {
    render(<PaymentDialog {...defaultProps} />)
    // Radix Select renders a combobox trigger — verify it is present
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('renders the note input', () => {
    render(<PaymentDialog {...defaultProps} />)
    expect(screen.getByPlaceholderText('Optional note…')).toBeInTheDocument()
  })
})
