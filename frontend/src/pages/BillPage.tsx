import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { useGetOrderQuery } from '@/features/orders/ordersApi'
import { useGetSettingsQuery } from '@/features/settings/settingsApi'
import { useAppSelector } from '@/app/hooks'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { OrderChannel, OrderStatus, UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDateInTz } from '@/lib/timezone'

// Light-mode-only badge classes for PDF rendering — no dark: variants
const BILL_CHANNEL_BADGE: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'bg-blue-100 text-blue-800',
  [OrderChannel.Takeaway]: 'bg-green-100 text-green-800',
  [OrderChannel.Zomato]:   'bg-red-100 text-red-800',
  [OrderChannel.Swiggy]:   'bg-orange-100 text-orange-800',
  [OrderChannel.Other]:    'bg-gray-100 text-gray-800',
}

const CHANNEL_LABEL: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'Dine-in',
  [OrderChannel.Takeaway]: 'Takeaway',
  [OrderChannel.Zomato]:   'Zomato',
  [OrderChannel.Swiggy]:   'Swiggy',
  [OrderChannel.Other]:    'Other',
}

const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Placed]:        'Placed',
  [OrderStatus.SentToKitchen]: 'Sent to Kitchen',
  [OrderStatus.Preparing]:     'Preparing',
  [OrderStatus.OutOfStock]:    'Out of Stock',
  [OrderStatus.Prepared]:      'Prepared',
  [OrderStatus.Served]:        'Served',
  [OrderStatus.Billed]:        'Billed',
  [OrderStatus.Paid]:          'Paid',
  [OrderStatus.Closed]:        'Closed',
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const ALLOWED_ROLES: UserRole[] = [UserRole.Admin, UserRole.Manager, UserRole.Waiter]

export function BillPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const timeZoneId = useAppSelector((s) => s.auth.timeZoneId) ?? 'UTC'
  const isAllowed = useRoleGuard(ALLOWED_ROLES)

  const [isPdfGenerating, setIsPdfGenerating] = useState(false)

  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
  } = useGetOrderQuery(id ?? '', { skip: !id })

  const { data: settings, isLoading: settingsLoading } = useGetSettingsQuery()

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-destructive">You do not have permission to view this page.</p>
      </div>
    )
  }

  if (orderLoading || settingsLoading) return <LoadingSpinner />

  if (orderError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <p className="text-destructive">Order not found or could not be loaded.</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>
      </div>
    )
  }

  const restaurantName = settings?.name ?? 'Restaurant'
  const logoUrl = settings?.logoUrl ?? null
  const gstRate = settings?.gstRate ?? 0

  const subtotal = order.totalAmount
  const gstAmount = gstRate > 0 ? subtotal * (gstRate / 100) : 0
  const grandTotal = subtotal + gstAmount

  async function handleDownloadPdf() {
    if (!order) return
    setIsPdfGenerating(true)
    try {
      const element = document.getElementById('bill-content')
      if (!element) return
      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`bill-${order.orderNumber}.pdf`)
    } finally {
      setIsPdfGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Action bar */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/orders')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleDownloadPdf} disabled={isPdfGenerating}>
          {isPdfGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isPdfGenerating ? 'Generating…' : 'Download PDF'}
        </Button>
      </div>

      {/* Bill content — captured by html2canvas */}
      <div
        id="bill-content"
        className="mx-auto max-w-lg rounded-lg border border-gray-200 bg-white p-8 text-gray-900 shadow-sm"
      >
        {/* Header */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`${restaurantName} logo`}
              className="mb-2 h-16 w-auto object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{restaurantName}</h1>
          <p className="text-sm text-gray-500">Bill / Receipt</p>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Bill meta */}
        <div className="mb-4 grid grid-cols-2 gap-y-1.5 text-sm">
          <span className="font-medium text-gray-600">Order #</span>
          <span className="text-right font-semibold text-gray-900">{order.orderNumber}</span>

          <span className="font-medium text-gray-600">Date</span>
          <span className="text-right text-gray-900">{formatDateInTz(order.createdAt, timeZoneId)}</span>

          <span className="font-medium text-gray-600">Channel</span>
          <span className="text-right">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${BILL_CHANNEL_BADGE[order.channel]}`}
            >
              {CHANNEL_LABEL[order.channel]}
            </span>
          </span>

          {order.customerName && (
            <>
              <span className="font-medium text-gray-600">Customer</span>
              <span className="text-right text-gray-900">{order.customerName}</span>
            </>
          )}

          {order.assignedWaiterName && (
            <>
              <span className="font-medium text-gray-600">Served by</span>
              <span className="text-right text-gray-900">{order.assignedWaiterName}</span>
            </>
          )}

          <span className="font-medium text-gray-600">Status</span>
          <span className="text-right text-gray-900">{ORDER_STATUS_LABEL[order.status]}</span>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Items table */}
        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="pb-2">Item</th>
              <th className="pb-2 text-center">Qty</th>
              <th className="pb-2 text-right">Unit Price</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                <td className="py-1.5 text-gray-900">
                  {item.menuItemName}
                  {item.customizationNote && (
                    <span className="ml-1 text-xs italic text-gray-400">
                      ({item.customizationNote})
                    </span>
                  )}
                </td>
                <td className="py-1.5 text-center text-gray-900">{item.quantity}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-900">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-gray-900">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="tabular-nums text-gray-900">{formatCurrency(subtotal)}</span>
          </div>

          {gstRate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">GST ({gstRate}%)</span>
              <span className="tabular-nums text-gray-900">{formatCurrency(gstAmount)}</span>
            </div>
          )}

          <div className="flex justify-between border-t border-gray-300 pt-2 text-base font-bold text-gray-900">
            <span>Grand Total</span>
            <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
          </div>

          {order.paymentMode && (
            <div className="flex justify-between text-gray-600">
              <span>Payment Mode</span>
              <span>{order.paymentMode}</span>
            </div>
          )}
        </div>

        <hr className="my-6 border-gray-200" />

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">Thank you for dining with us!</p>
      </div>
    </div>
  )
}
