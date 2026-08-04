import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getSignalRConnection } from '@/app/signalr'
import { useGetLiveFloorsQuery } from '@/features/tables/tablesLiveApi'
import { useOrderTimer } from '@/hooks/useOrderTimer'
import { TABLE_STATUS_CLASSES } from '@/types/enums'
import { formatInTz } from '@/lib/timezone'
import type { RootState } from '@/app/store'
import type { TableLiveDto } from '@/types/api'

// ---------------------------------------------------------------------------
// TableCard
// ---------------------------------------------------------------------------

interface TableCardProps {
  table: TableLiveDto
  onClick: (table: TableLiveDto) => void
}

function TableCard({ table, onClick }: TableCardProps) {
  const isOccupied = table.status === 'Occupied'

  const placedAt =
    isOccupied && table.activeOrder ? table.activeOrder.placedAt : new Date(0).toISOString()
  const { elapsed, isDelayed } = useOrderTimer(placedAt, 45)

  const statusClass = TABLE_STATUS_CLASSES[table.status] ?? TABLE_STATUS_CLASSES['Inactive']
  const shapeClass = table.shape === 'Round' ? 'rounded-full' : 'rounded-lg'

  function handleClick(e: React.MouseEvent) {
    // Prevent canvas drag from triggering click
    e.stopPropagation()
    if (isOccupied) onClick(table)
  }

  return (
    <div
      className={`absolute flex flex-col items-center justify-center select-none border-2 transition-shadow ${statusClass} ${shapeClass} ${
        isOccupied ? 'cursor-pointer hover:shadow-xl hover:scale-105' : 'cursor-default'
      }`}
      style={{
        left: `${table.positionX}%`,
        top: `${table.positionY}%`,
        width: `${table.width}%`,
        height: `${table.height}%`,
      }}
      onClick={handleClick}
      title={`Table ${table.tableNumber} — ${table.status}`}
    >
      <span className="text-xs font-bold leading-none">{table.tableNumber}</span>
      <span className="text-[10px] leading-none mt-0.5 opacity-75">{table.capacity} seats</span>
      {isOccupied && table.activeOrder && (
        <span className={`text-[10px] font-semibold mt-0.5 ${isDelayed ? 'text-red-300' : ''}`}>
          {elapsed}m
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// OrderDetailDialog
// ---------------------------------------------------------------------------

interface OrderDetailDialogProps {
  table: TableLiveDto
  onClose: () => void
  timeZoneId: string
}

function OrderDetailDialog({ table, onClose, timeZoneId }: OrderDetailDialogProps) {
  const order = table.activeOrder
  if (!order) return null

  const elapsed = Math.floor((Date.now() - new Date(order.placedAt).getTime()) / 60000)

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Table {table.tableNumber} — #{order.orderNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-4">
          {order.customerName && (
            <div>
              <span className="font-medium">Customer:</span> {order.customerName}
            </div>
          )}
          <div>
            <span className="font-medium">Members:</span> {order.memberCount}
          </div>
          {order.assignedWaiterName && (
            <div>
              <span className="font-medium">Waiter:</span> {order.assignedWaiterName}
            </div>
          )}
          <div>
            <span className="font-medium">Placed:</span>{' '}
            {formatInTz(order.placedAt, timeZoneId)} ({elapsed}m ago)
          </div>
          <div>
            <span className="font-medium">Status:</span>{' '}
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {order.status}
            </span>
          </div>
        </div>

        <div className="border-t dark:border-gray-700 pt-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Items</h3>
          <ul className="space-y-1">
            {order.items.map((item, idx) => (
              <li
                key={idx}
                className="flex justify-between text-sm text-gray-700 dark:text-gray-300"
              >
                <span>
                  {item.quantity}× {item.menuItemName}
                  {item.customizationNote && (
                    <span className="text-gray-400 text-xs ml-1">({item.customizationNote})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t dark:border-gray-700 pt-4 flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
          <span className="text-base font-bold text-gray-900 dark:text-gray-100">
            ₹{order.totalAmount.toFixed(2)}
          </span>
        </div>

        <div className="mt-4">
          <Link
            to={`/orders/${order.orderId}/bill`}
            className="block w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center transition-colors hover:bg-primary/90"
            onClick={onClose}
          >
            View Bill
          </Link>
        </div>

        <button
          onClick={onClose}
          className="mt-2 w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// FloorLegend
// ---------------------------------------------------------------------------

function FloorLegend() {
  const items: Array<{ label: string; cls: string }> = [
    { label: 'Available', cls: 'bg-gray-100 border border-gray-300 dark:bg-gray-800 dark:border-gray-600' },
    { label: 'Occupied',  cls: 'bg-primary' },
    { label: 'Reserved',  cls: 'bg-amber-100 border border-amber-400 dark:bg-amber-900 dark:border-amber-600' },
    { label: 'Cleaning',  cls: 'bg-blue-100 border border-blue-400 dark:bg-blue-900 dark:border-blue-600' },
    { label: 'Inactive',  cls: 'bg-gray-50 border border-gray-200 dark:bg-gray-900 dark:border-gray-700 opacity-60' },
  ]

  return (
    <div className="flex flex-wrap gap-3 px-4 py-2 border-t dark:border-gray-700">
      {items.map(({ label, cls }) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${cls}`} />
          <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ZoomCanvas — scroll-to-zoom, drag-to-pan
// ---------------------------------------------------------------------------

interface ZoomCanvasProps {
  children: React.ReactNode
}

function ZoomCanvas({ children }: ZoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; panX: number; panY: number }>({
    active: false, startX: 0, startY: 0, panX: 0, panY: 0,
  })

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 0.9

    setZoom((prev) => {
      const next = Math.min(4, Math.max(0.3, prev * factor))
      const scale = next / prev
      setPan((p) => ({
        x: mouseX - scale * (mouseX - p.x),
        y: mouseY - scale * (mouseY - p.y),
      }))
      return next
    })
  }, [])

  // Passive: false so we can call preventDefault on wheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    // Only start drag on the canvas background (not on a table card)
    if ((e.target as HTMLElement).closest('[data-table-card]')) return
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    })
  }

  function handleMouseUp() {
    dragRef.current.active = false
  }

  function handleMouseLeave() {
    dragRef.current.active = false
  }

  function handleReset() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="relative flex-1 min-h-0">
      {/* Zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(4, z * 1.2))}
          className="w-7 h-7 rounded bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-base font-bold hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleReset}
          className="h-7 px-2 rounded bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-white dark:hover:bg-gray-800 shadow-sm"
          title="Reset zoom"
        >
          {zoomPercent}%
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
          className="w-7 h-7 rounded bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-base font-bold hover:bg-white dark:hover:bg-gray-800 shadow-sm flex items-center justify-center"
          title="Zoom out"
        >
          −
        </button>
      </div>

      {/* Hint */}
      <div className="absolute bottom-3 right-3 z-10 text-[10px] text-gray-400 dark:text-gray-600 select-none pointer-events-none">
        Scroll to zoom · Drag to pan
      </div>

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Transformed inner plane — 100×100 coordinate space */}
        <div
          className="absolute"
          style={{
            width: '100%',
            height: '100%',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TablesPage
// ---------------------------------------------------------------------------

export function TablesPage() {
  const { data: floors, isLoading, isError, refetch } = useGetLiveFloorsQuery()
  const [activeFloorIndex, setActiveFloorIndex] = useState(0)
  const [selectedTable, setSelectedTable] = useState<TableLiveDto | null>(null)

  const timeZoneId = useSelector((state: RootState) => state.auth.timeZoneId)

  useEffect(() => {
    const connection = getSignalRConnection()
    function handleTableStatusChanged() {
      void refetch()
    }
    connection.on('TableStatusChanged', handleTableStatusChanged)
    return () => { connection.off('TableStatusChanged', handleTableStatusChanged) }
  }, [refetch])

  // Keep dialog in sync after a SignalR-triggered refetch
  useEffect(() => {
    if (!selectedTable || !floors) return
    for (const floor of floors) {
      const updated = floor.tables.find((t) => t.id === selectedTable.id)
      if (updated) {
        if (updated.status !== 'Occupied') setSelectedTable(null)
        else setSelectedTable(updated)
        return
      }
    }
  }, [floors, selectedTable])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading floors…</div>
      </div>
    )
  }

  if (isError || !floors) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load floor data.</div>
      </div>
    )
  }

  if (floors.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">No floors configured yet.</div>
      </div>
    )
  }

  const sorted = [...floors].sort((a, b) => a.displayOrder - b.displayOrder)
  const safeIndex = activeFloorIndex < sorted.length ? activeFloorIndex : 0
  const displayFloor = sorted[safeIndex]

  return (
    // h-full + flex-col so this page fills whatever height the shell gives it
    <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex-shrink-0">Tables</h1>

      {/* Floor tabs */}
      <div className="flex gap-2 flex-wrap flex-shrink-0">
        {sorted.map((floor, idx) => (
          <button
            key={floor.id}
            onClick={() => setActiveFloorIndex(idx)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              idx === safeIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {floor.name}
          </button>
        ))}
      </div>

      {/* Zoom canvas — flex-1 + min-h-0 to fill remaining vertical space */}
      <ZoomCanvas>
        {displayFloor.tables.map((table) => (
          <TableCard key={table.id} table={table} onClick={setSelectedTable} />
        ))}
      </ZoomCanvas>

      <FloorLegend />

      {selectedTable && (
        <OrderDetailDialog
          table={selectedTable}
          onClose={() => setSelectedTable(null)}
          timeZoneId={timeZoneId}
        />
      )}
    </div>
  )
}
