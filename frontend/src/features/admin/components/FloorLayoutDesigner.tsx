import { useState, useRef, useEffect, useCallback } from 'react'
import { Pencil, Trash2, Check, X, Plus, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/toaster'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import {
  useGetFloorsQuery,
  useCreateFloorMutation,
  useUpdateFloorMutation,
  useDeleteFloorMutation,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from '../api/floorApi'
import type { RestaurantTableDto } from '@/types/api'
import { TableStatus, TABLE_STATUS_COLOR } from '@/types/enums'

// ---------------------------------------------------------------------------
// TableItem — renders one table on the canvas with hover edit/delete actions
// ---------------------------------------------------------------------------

interface TableItemProps {
  table: RestaurantTableDto
  onMouseDown: (e: React.MouseEvent, tableId: string) => void
  onEdit: (tableId: string) => void
  onDelete: (tableId: string) => void
}

function TableItem({ table, onMouseDown, onEdit, onDelete }: TableItemProps) {
  const statusColors =
    TABLE_STATUS_COLOR[table.status as TableStatus] ?? 'border-gray-300 bg-gray-50'
  const shapeClass = table.shape === 'Round' ? 'rounded-full' : 'rounded-md'
  const visualHeight =
    table.shape === 'Rectangle' ? `${table.width * 0.6}%` : `${table.width}%`

  return (
    <div
      className={cn(
        'group absolute flex cursor-grab select-none flex-col items-center justify-center border-2 text-center shadow-sm transition-shadow active:cursor-grabbing',
        shapeClass,
        statusColors,
      )}
      style={{
        left: `${table.positionX}%`,
        top: `${table.positionY}%`,
        width: `${table.width}%`,
        height: visualHeight,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        onMouseDown(e, table.id)
      }}
    >
      {/* Table label */}
      <span className="text-xs font-bold leading-tight">{table.tableNumber}</span>
      <span className="text-[10px] text-muted-foreground">{table.capacity}p</span>

      {/* Hover action buttons — shown inside the table at the top */}
      <div className="absolute inset-x-0 top-0.5 flex justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          className="rounded bg-background/90 p-0.5 text-muted-foreground shadow-sm hover:text-primary"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onEdit(table.id)
          }}
          aria-label={`Edit ${table.tableNumber}`}
        >
          <Pencil className="h-2.5 w-2.5" />
        </button>
        <button
          type="button"
          className="rounded bg-background/90 p-0.5 text-muted-foreground shadow-sm hover:text-destructive"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(table.id)
          }}
          aria-label={`Delete ${table.tableNumber}`}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

interface DragState {
  tableId: string
  startX: number
  startY: number
  origPosX: number
  origPosY: number
}

// ---------------------------------------------------------------------------
// FloorLayoutDesigner — main component
// ---------------------------------------------------------------------------

export function FloorLayoutDesigner() {
  const { data: floors, isLoading, isError, refetch: refetchFloors } = useGetFloorsQuery()

  const [createFloor] = useCreateFloorMutation()
  const [updateFloor] = useUpdateFloorMutation()
  const [deleteFloor] = useDeleteFloorMutation()
  const [createTable] = useCreateTableMutation()
  const [updateTable] = useUpdateTableMutation()
  const [deleteTable] = useDeleteTableMutation()

  // Floor management
  const [activeFloorId, setActiveFloorId] = useState<string | null>(null)
  const [isFloorSheetOpen, setIsFloorSheetOpen] = useState(false)
  const [isAddingFloor, setIsAddingFloor] = useState(false)
  const [newFloorName, setNewFloorName] = useState('')
  const [editingFloorId, setEditingFloorId] = useState<string | null>(null)
  const [editingFloorName, setEditingFloorName] = useState('')

  // Table management
  const [localTables, setLocalTables] = useState<Record<string, RestaurantTableDto>>({})

  // Edit sheet
  const [editTableId, setEditTableId] = useState<string | null>(null)
  const [editTableDraft, setEditTableDraft] = useState<RestaurantTableDto | null>(null)

  // Delete dialog
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null)
  const [isDeletingTable, setIsDeletingTable] = useState(false)

  // Drag
  const [isDragging, setIsDragging] = useState(false)
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Save
  const [isSaving, setIsSaving] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)

  // Sync local tables when active floor changes or data loads
  useEffect(() => {
    if (floors && floors.length > 0 && !activeFloorId) {
      const first = floors[0]
      setActiveFloorId(first.id)
      const map: Record<string, RestaurantTableDto> = {}
      first.tables.forEach((t) => { map[t.id] = t })
      setLocalTables(map)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floors])

  // ---------------------------------------------------------------------------
  // Floor handlers
  // ---------------------------------------------------------------------------

  const handleFloorClick = useCallback(
    (floorId: string) => {
      setActiveFloorId(floorId)
      const floor = floors?.find((f) => f.id === floorId)
      if (floor) {
        const map: Record<string, RestaurantTableDto> = {}
        floor.tables.forEach((t) => { map[t.id] = t })
        setLocalTables(map)
      }
      setIsFloorSheetOpen(false)
    },
    [floors],
  )

  async function handleAddFloorConfirm() {
    const trimmed = newFloorName.trim()
    if (!trimmed) { setIsAddingFloor(false); return }
    try {
      const result = await createFloor({ name: trimmed, displayOrder: floors?.length ?? 0 }).unwrap()
      setIsAddingFloor(false)
      setNewFloorName('')
      setActiveFloorId(result.id)
      setLocalTables({})
    } catch {
      toast.error('Failed to create floor')
    }
  }

  function handleAddFloorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleAddFloorConfirm()
    else if (e.key === 'Escape') { setIsAddingFloor(false); setNewFloorName('') }
  }

  async function handleEditFloorConfirm() {
    if (!editingFloorId) return
    const trimmed = editingFloorName.trim()
    if (!trimmed) { setEditingFloorId(null); return }
    const floor = floors?.find((f) => f.id === editingFloorId)
    if (!floor) { setEditingFloorId(null); return }
    try {
      await updateFloor({ id: editingFloorId, name: trimmed, displayOrder: floor.displayOrder }).unwrap()
      setEditingFloorId(null)
    } catch {
      toast.error('Failed to rename floor')
      setEditingFloorId(null)
    }
  }

  function handleEditFloorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleEditFloorConfirm()
    else if (e.key === 'Escape') setEditingFloorId(null)
  }

  async function handleDeleteFloor(floorId: string) {
    try {
      await deleteFloor(floorId).unwrap()
      if (activeFloorId === floorId) {
        const remaining = floors?.filter((f) => f.id !== floorId) ?? []
        if (remaining.length > 0) {
          handleFloorClick(remaining[0].id)
        } else {
          setActiveFloorId(null)
          setLocalTables({})
        }
      }
    } catch {
      toast.error('Failed to delete floor')
    }
  }

  // ---------------------------------------------------------------------------
  // Table handlers
  // ---------------------------------------------------------------------------

  function handleAddTable() {
    if (!activeFloorId) return
    const tableCount = Object.keys(localTables).length + 1
    const tempId = `new-${crypto.randomUUID()}`
    const newTable: RestaurantTableDto = {
      id: tempId,
      floorId: activeFloorId,
      tableNumber: `T${tableCount}`,
      capacity: 4,
      shape: 'Square',
      positionX: 50,
      positionY: 50,
      width: 10,
      height: 10,
      status: 'Available',
    }
    setLocalTables((prev) => ({ ...prev, [tempId]: newTable }))
    // Open edit sheet immediately for the new table
    setEditTableId(tempId)
    setEditTableDraft({ ...newTable })
  }

  function handleEditTable(tableId: string) {
    const table = localTables[tableId]
    if (!table) return
    setEditTableId(tableId)
    setEditTableDraft({ ...table })
  }

  function handleSaveTableEdit() {
    if (!editTableId || !editTableDraft) return
    setLocalTables((prev) => ({ ...prev, [editTableId]: editTableDraft }))
    setEditTableId(null)
    setEditTableDraft(null)
  }

  function handleDeleteTableRequest(tableId: string) {
    setDeleteTableId(tableId)
  }

  async function handleDeleteTableConfirm() {
    if (!deleteTableId) return
    setIsDeletingTable(true)

    if (deleteTableId.startsWith('new-')) {
      setLocalTables((prev) => {
        const next = { ...prev }
        delete next[deleteTableId]
        return next
      })
      setDeleteTableId(null)
      setIsDeletingTable(false)
      return
    }

    try {
      await deleteTable(deleteTableId).unwrap()
      setLocalTables((prev) => {
        const next = { ...prev }
        delete next[deleteTableId]
        return next
      })
      setDeleteTableId(null)
    } catch {
      toast.error('Failed to delete table')
    } finally {
      setIsDeletingTable(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  function handleTableMouseDown(e: React.MouseEvent, tableId: string) {
    const table = localTables[tableId]
    if (!table) return
    setDragState({ tableId, startX: e.clientX, startY: e.clientY, origPosX: table.positionX, origPosY: table.positionY })
    setIsDragging(true)
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragState || !canvasRef.current) return
    const canvas = canvasRef.current.getBoundingClientRect()
    const deltaXPct = ((e.clientX - dragState.startX) / canvas.width) * 100
    const deltaYPct = ((e.clientY - dragState.startY) / canvas.height) * 100
    const newX = Math.min(95, Math.max(5, dragState.origPosX + deltaXPct))
    const newY = Math.min(95, Math.max(5, dragState.origPosY + deltaYPct))
    setLocalTables((prev) => ({
      ...prev,
      [dragState.tableId]: { ...prev[dragState.tableId], positionX: newX, positionY: newY },
    }))
  }

  function handleCanvasMouseUp() {
    setIsDragging(false)
    setDragState(null)
  }

  // ---------------------------------------------------------------------------
  // Save layout
  // ---------------------------------------------------------------------------

  async function handleSaveLayout() {
    if (!activeFloorId) return
    setIsSaving(true)
    try {
      const tables = Object.values(localTables)
      const newTables = tables.filter((t) => t.id.startsWith('new-'))
      const existingTables = tables.filter((t) => !t.id.startsWith('new-'))

      for (const t of newTables) {
        await createTable({
          floorId: t.floorId,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          shape: t.shape,
          positionX: t.positionX,
          positionY: t.positionY,
          width: t.width,
          height: t.height,
        }).unwrap()
      }
      for (const t of existingTables) {
        await updateTable({
          id: t.id,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          shape: t.shape,
          positionX: t.positionX,
          positionY: t.positionY,
          width: t.width,
          height: t.height,
          status: t.status,
        }).unwrap()
      }

      const result = await refetchFloors()
      if (result.data) {
        const updatedFloor = result.data.find((f) => f.id === activeFloorId)
        if (updatedFloor) {
          const map: Record<string, RestaurantTableDto> = {}
          updatedFloor.tables.forEach((t) => { map[t.id] = t })
          setLocalTables(map)
        }
      }

      toast.success('Layout saved', 'Floor plan updated successfully.')
    } catch {
      toast.error('Save failed', 'Could not save the floor plan.')
    } finally {
      setIsSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const activeFloor = floors?.find((f) => f.id === activeFloorId) ?? null
  const deleteTargetTable = deleteTableId ? localTables[deleteTableId] : null

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorMessage message="Failed to load floor plans." />

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Floor Plan Designer</h2>
        <div className="flex items-center gap-2">
          {/* Floors icon button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFloorSheetOpen(true)}
            className="gap-1.5"
          >
            <Layers className="h-3.5 w-3.5" />
            Floors
            {floors && floors.length > 0 && (
              <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                {floors.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Canvas card */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-card">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium">
            {activeFloor?.name ?? (
              <span className="text-muted-foreground">No floor selected</span>
            )}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAddTable} disabled={!activeFloorId}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Table
            </Button>
            <Button
              size="sm"
              onClick={() => void handleSaveLayout()}
              disabled={!activeFloorId || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save Layout'}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            minHeight: '500px',
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {!activeFloorId && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Layers className="h-8 w-8 opacity-30" />
              <span>Open Floors to select or create a floor</span>
              <Button size="sm" variant="outline" onClick={() => setIsFloorSheetOpen(true)}>
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Manage Floors
              </Button>
            </div>
          )}

          {Object.values(localTables).map((table) => (
            <TableItem
              key={table.id}
              table={table}
              onMouseDown={handleTableMouseDown}
              onEdit={handleEditTable}
              onDelete={handleDeleteTableRequest}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Floors Sheet (left)                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Sheet open={isFloorSheetOpen} onOpenChange={setIsFloorSheetOpen}>
        <SheetContent side="left" className="flex w-72 flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-base">Floors</SheetTitle>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {floors?.map((floor) => (
              <div
                key={floor.id}
                className={cn(
                  'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
                  activeFloorId === floor.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                {editingFloorId === floor.id ? (
                  <>
                    <Input
                      value={editingFloorName}
                      onChange={(e) => setEditingFloorName(e.target.value)}
                      onBlur={() => void handleEditFloorConfirm()}
                      onKeyDown={handleEditFloorKeyDown}
                      className="h-6 flex-1 px-1 text-xs"
                      autoFocus
                    />
                    <button
                      onClick={() => void handleEditFloorConfirm()}
                      className="shrink-0 text-green-600 hover:text-green-700"
                      aria-label="Confirm rename"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setEditingFloorId(null)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Cancel rename"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="flex-1 truncate text-left"
                      onClick={() => handleFloorClick(floor.id)}
                    >
                      {floor.name}
                    </button>
                    {activeFloorId === floor.id && (
                      <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        active
                      </span>
                    )}
                    <button
                      className="invisible shrink-0 text-muted-foreground hover:text-foreground group-hover:visible"
                      onClick={() => {
                        setEditingFloorId(floor.id)
                        setEditingFloorName(floor.name)
                      }}
                      aria-label={`Rename ${floor.name}`}
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      className="invisible shrink-0 text-muted-foreground hover:text-destructive group-hover:visible"
                      onClick={() => void handleDeleteFloor(floor.id)}
                      aria-label={`Delete ${floor.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            ))}

            {/* Inline add floor */}
            {isAddingFloor ? (
              <div className="flex items-center gap-1 px-2 py-1">
                <Input
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  onKeyDown={handleAddFloorKeyDown}
                  onBlur={() => void handleAddFloorConfirm()}
                  placeholder="Floor name…"
                  className="h-7 flex-1 px-1 text-xs"
                  autoFocus
                />
                <button
                  onClick={() => { setIsAddingFloor(false); setNewFloorName('') }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cancel"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                className="mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => { setIsAddingFloor(true); setNewFloorName('') }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Floor
              </button>
            )}

            {floors?.length === 0 && !isAddingFloor && (
              <p className="px-2 py-2 text-xs text-muted-foreground">No floors yet. Add one above.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Table Edit Sheet (right)                                             */}
      {/* ------------------------------------------------------------------ */}
      <Sheet
        open={editTableId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTableId(null)
            setEditTableDraft(null)
          }
        }}
      >
        <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-base">
              {editTableDraft?.tableNumber
                ? `Edit ${editTableDraft.tableNumber}`
                : 'Table Properties'}
            </SheetTitle>
          </SheetHeader>

          {editTableDraft && (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-tableNumber" className="text-xs">Table Number</Label>
                <Input
                  id="edit-tableNumber"
                  value={editTableDraft.tableNumber}
                  onChange={(e) =>
                    setEditTableDraft((prev) => prev ? { ...prev, tableNumber: e.target.value } : prev)
                  }
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-capacity" className="text-xs">Capacity (seats)</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  max={20}
                  value={editTableDraft.capacity}
                  onChange={(e) =>
                    setEditTableDraft((prev) =>
                      prev ? { ...prev, capacity: Number(e.target.value) } : prev,
                    )
                  }
                  className="h-8 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Shape</Label>
                <Select
                  value={editTableDraft.shape}
                  onValueChange={(v) =>
                    setEditTableDraft((prev) => prev ? { ...prev, shape: v } : prev)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Square">Square</SelectItem>
                    <SelectItem value="Round">Oval</SelectItem>
                    <SelectItem value="Rectangle">Rectangle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={editTableDraft.status}
                  onValueChange={(v) =>
                    setEditTableDraft((prev) => prev ? { ...prev, status: v } : prev)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="Occupied">Occupied</SelectItem>
                    <SelectItem value="Reserved">Reserved</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <SheetFooter className="border-t px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditTableId(null); setEditTableDraft(null) }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTableEdit}>
              Save Changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ------------------------------------------------------------------ */}
      {/* Delete Confirmation Dialog                                           */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={deleteTableId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTableId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete table?</DialogTitle>
            <DialogDescription>
              {deleteTargetTable
                ? `Are you sure you want to delete table "${deleteTargetTable.tableNumber}" (${deleteTargetTable.capacity} seats)? This cannot be undone.`
                : 'Are you sure you want to delete this table?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDeletingTable}
              onClick={() => setDeleteTableId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingTable}
              onClick={() => void handleDeleteTableConfirm()}
            >
              {isDeletingTable ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
