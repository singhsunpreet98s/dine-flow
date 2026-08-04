import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { PaymentMode } from '@/types/enums'
import { paymentDialogSchema, type PaymentDialogValues } from './orderSchemas'

const PAYMENT_MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: PaymentMode.UPI,        label: 'UPI' },
  { value: PaymentMode.DebitCard,  label: 'Debit Card' },
  { value: PaymentMode.CreditCard, label: 'Credit Card' },
  { value: PaymentMode.Cash,       label: 'Cash' },
]

interface PaymentDialogProps {
  orderNumber: string
  totalAmount: number
  isLoading: boolean
  onConfirm: (values: PaymentDialogValues) => void
  onCancel: () => void
}

export function PaymentDialog({ orderNumber, totalAmount, isLoading, onConfirm, onCancel }: PaymentDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentDialogValues>({ resolver: yupResolver(paymentDialogSchema) })

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Mark as Paid</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-5">
          {orderNumber} &mdash; ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </p>

        <form onSubmit={handleSubmit(onConfirm)} className="space-y-4">
          <Controller
            name="paymentMode"
            control={control}
            render={({ field }) => (
              <FormField label="Payment Mode" htmlFor="pay-mode" error={errors.paymentMode?.message} required>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <SelectTrigger id="pay-mode">
                    <SelectValue placeholder="Select mode…" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          />

          <FormField label="Note" htmlFor="pay-note" error={errors.note?.message} hint="Optional — e.g. transaction ID">
            <Input id="pay-note" placeholder="Optional note…" {...register('note')} />
          </FormField>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
