import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Pencil, Trash2, Check, X, Plus, Save } from 'lucide-react'
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
  useUpdateFloorMutation,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
} from '@/features/admin/api/floorApi'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RestaurantTableDto } from '@/types/api'

// ---------------------------------------------------------------------------
// TableItem
// ---------------------------------------------------------------------------

interface TableItemProps {
  table: RestaurantTableDto
  onMouseDown: (e: React.MouseEvent, tableId: string) => void
  onEdit: (tableId: string) => void
  onDelete: (tableId: string) => void
}

function TableItem({ table, onMouseDown, onEdit, onDelete }: TableItemProps) {
  const shapeClass = table.shape === 'Round' ? 'rounded-full' : 'rounded-md'
  const tableStyle: React.CSSProperties = {
    left:      `${table.positionX}%`,
    top:       `${table.positionY}%`,
    width:     `${table.width}%`,
    height:    table.shape === 'Rectangle' ? `${table.width * 0.6}%` : `${table.width}%`,
    transform: 'translate(-50%, -50%)',
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'group absolute flex cursor-grab select-none flex-col items-center justify-center border-2 border-primary bg-primary/10 text-center shadow-sm transition-shadow active:cursor-grabbing dark:bg-primary/15',
          shapeClass,
        )}
        style={tableStyle}
        onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, table.id) }}
      >
        {/* Action buttons — float above the table on hover */}
        <div className="pointer-events-none absolute -top-9 left-1/2 flex -translate-x-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border bg-background shadow-md text-muted-foreground hover:border-primary hover:text-primary"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onEdit(table.id) }}
                aria-label={`Edit ${table.tableNumber}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Edit table</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border bg-background shadow-md text-muted-foreground hover:border-destructive hover:text-destructive"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(table.id) }}
                aria-label={`Delete ${table.tableNumber}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Delete table</TooltipContent>
          </Tooltip>
        </div>

        <span className="text-xs font-bold leading-tight">{table.tableNumber}</span>
        <span className="text-[10px] text-muted-foreground">{table.capacity}p</span>
      </div>
    </TooltipProvider>
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
// FloorEditorPage
// ---------------------------------------------------------------------------

export function FloorEditorPage() {
  const { floorId } = useParams<{ floorId: string }>()

  const { data: floors, isLoading, isError, refetch: refetchFloors } = useGetFloorsQuery()
  const [updateFloor] = useUpdateFloorMutation()
  const [createTable] = useCreateTableMutation()
  const [updateTable] = useUpdateTableMutation()
  const [deleteTable] = useDeleteTableMutation()

  const floor = floors?.find((f) => f.id === floorId) ?? null

  // ---------------------------------------------------------------------------
  // Inline floor name editing
  // ---------------------------------------------------------------------------
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  function handleStartEditName() {
    if (!floor) return
    setNameDraft(floor.name)
    setIsEditingName(true)
  }

  async function handleSaveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed || !floor) { setIsEditingName(false); return }
    if (trimmed === floor.name) { setIsEditingName(false); return }
    setIsSavingName(true)
    try {
      await updateFloor({ id: floor.id, name: trimmed, displayOrder: floor.displayOrder }).unwrap()
      setIsEditingName(false)
    } catch {
      toast.error('Failed to rename floor')
    } finally {
      setIsSavingName(false)
    }
  }

  function handleNameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSaveName()
    else if (e.key === 'Escape') setIsEditingName(false)
  }

  // ---------------------------------------------------------------------------
  // Local table state — sync once per floor ID change
  // ---------------------------------------------------------------------------
  const [localTables, setLocalTables] = useState<Record<string, RestaurantTableDto>>({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (floor) {
      const map: Record<string, RestaurantTableDto> = {}
      floor.tables.forEach((t) => { map[t.id] = t })
      setLocalTables(map)
    }
  }, [floor?.id])

  // ---------------------------------------------------------------------------
  // Table edit sheet
  // ---------------------------------------------------------------------------
  const [editTableId, setEditTableId] = useState<string | null>(null)
  const [editTableDraft, setEditTableDraft] = useState<RestaurantTableDto | null>(null)

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

  // ---------------------------------------------------------------------------
  // Table delete dialog
  // ---------------------------------------------------------------------------
  const [deleteTableId, setDeleteTableId] = useState<string | null>(null)
  const [isDeletingTable, setIsDeletingTable] = useState(false)

  async function handleDeleteTableConfirm() {
    if (!deleteTableId) return
    setIsDeletingTable(true)
    if (deleteTableId.startsWith('new-')) {
      setLocalTables((prev) => { const next = { ...prev }; delete next[deleteTableId]; return next })
      setDeleteTableId(null)
      setIsDeletingTable(false)
      return
    }
    try {
      await deleteTable(deleteTableId).unwrap()
      setLocalTables((prev) => { const next = { ...prev }; delete next[deleteTableId]; return next })
      setDeleteTableId(null)
    } catch {
      toast.error('Failed to delete table')
    } finally {
      setIsDeletingTable(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Add table
  // ---------------------------------------------------------------------------
  function handleAddTable() {
    if (!floorId) return
    const tableCount = Object.keys(localTables).length + 1
    const tempId = `new-${crypto.randomUUID()}`
    const newTable: RestaurantTableDto = {
      id: tempId,
      floorId,
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
    setEditTableId(tempId)
    setEditTableDraft({ ...newTable })
  }

  // ---------------------------------------------------------------------------
  // Drag
  // ---------------------------------------------------------------------------
  const [isDragging, setIsDragging] = useState(false)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  function handleTableMouseDown(e: React.MouseEvent, tableId: string) {
    const table = localTables[tableId]
    if (!table) return
    setDragState({ tableId, startX: e.clientX, startY: e.clientY, origPosX: table.positionX, origPosY: table.positionY })
    setIsDragging(true)
  }

  function handleCanvasMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragState || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const newX = Math.min(95, Math.max(5, dragState.origPosX + ((e.clientX - dragState.startX) / rect.width) * 100))
    const newY = Math.min(95, Math.max(5, dragState.origPosY + ((e.clientY - dragState.startY) / rect.height) * 100))
    setLocalTables((prev) => ({
      ...prev,
      [dragState.tableId]: { ...prev[dragState.tableId], positionX: newX, positionY: newY },
    }))
  }

  function handleCanvasMouseUp() { setIsDragging(false); setDragState(null) }

  // ---------------------------------------------------------------------------
  // Save layout
  // ---------------------------------------------------------------------------
  const [isSaving, setIsSaving] = useState(false)

  async function handleSaveLayout() {
    if (!floorId) return
    setIsSaving(true)
    try {
      const tables = Object.values(localTables)
      for (const t of tables.filter((t) => t.id.startsWith('new-'))) {
        await createTable({ floorId: t.floorId, tableNumber: t.tableNumber, capacity: t.capacity, shape: t.shape, positionX: t.positionX, positionY: t.positionY, width: t.width, height: t.height }).unwrap()
      }
      for (const t of tables.filter((t) => !t.id.startsWith('new-'))) {
        await updateTable({ id: t.id, tableNumber: t.tableNumber, capacity: t.capacity, shape: t.shape, positionX: t.positionX, positionY: t.positionY, width: t.width, height: t.height, status: t.status }).unwrap()
      }
      const result = await refetchFloors()
      if (result.data) {
        const updated = result.data.find((f) => f.id === floorId)
        if (updated) {
          const map: Record<string, RestaurantTableDto> = {}
          updated.tables.forEach((t) => { map[t.id] = t })
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
  // Render
  // ---------------------------------------------------------------------------
  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorMessage message="Failed to load floor." />
  if (!floor) return <ErrorMessage message="Floor not found." />

  const deleteTargetTable = deleteTableId ? localTables[deleteTableId] : null

  return (
    // h-full so this page fills the <main> completely; overflow-hidden prevents scroll
    <div className="flex h-full flex-col overflow-hidden">

      {/* Canvas — fills all space */}
      <div className="relative min-h-0 flex-1">
        {/* Dot-grid background */}
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {/* ---------------------------------------------------------- */}
          {/* Canvas overlay — top bar with name + actions               */}
          {/* ---------------------------------------------------------- */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
            {/* Floor name — left */}
            <div className="pointer-events-auto">
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={handleNameKeyDown}
                    className="h-8 w-44 bg-background/95 text-sm font-semibold shadow"
                    autoFocus
                    disabled={isSavingName}
                  />
                  <button
                    type="button"
                    className="rounded bg-background/95 p-1.5 text-green-600 shadow hover:bg-background hover:text-green-700"
                    onClick={() => void handleSaveName()}
                    disabled={isSavingName}
                    aria-label="Save name"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded bg-background/95 p-1.5 text-muted-foreground shadow hover:bg-background hover:text-foreground"
                    onClick={() => setIsEditingName(false)}
                    aria-label="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="group flex items-center gap-1.5 rounded-md bg-background/80 px-2.5 py-1.5 shadow backdrop-blur-sm">
                  <span className="text-sm font-semibold">{floor.name}</span>
                  <button
                    type="button"
                    className="opacity-0 text-muted-foreground transition-opacity hover:text-foreground group-hover:opacity-100"
                    onClick={handleStartEditName}
                    aria-label="Rename floor"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons — right */}
            <TooltipProvider>
              <div className="pointer-events-auto flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      className="bg-background/95 shadow backdrop-blur-sm"
                      onClick={handleAddTable}
                      aria-label="Add Table"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Add Table</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="shadow"
                      onClick={() => void handleSaveLayout()}
                      disabled={isSaving}
                      aria-label="Save Layout"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Save Layout</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>

          {/* Empty state */}
          {Object.keys(localTables).length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>No tables yet — click Add Table to start designing.</p>
            </div>
          )}

          {/* Tables */}
          {Object.values(localTables).map((table) => (
            <TableItem
              key={table.id}
              table={table}
              onMouseDown={handleTableMouseDown}
              onEdit={handleEditTable}
              onDelete={setDeleteTableId}
            />
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Table Edit Sheet                                                  */}
      {/* ---------------------------------------------------------------- */}
      <Sheet
        open={editTableId !== null}
        onOpenChange={(open) => { if (!open) { setEditTableId(null); setEditTableDraft(null) } }}
      >
        <SheetContent side="right" className="flex w-80 flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="text-base">
              {editTableDraft?.tableNumber ? `Edit ${editTableDraft.tableNumber}` : 'Table Properties'}
            </SheetTitle>
          </SheetHeader>

          {editTableDraft && (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-tableNumber" className="text-xs">Table Number</Label>
                <Input
                  id="edit-tableNumber"
                  value={editTableDraft.tableNumber}
                  onChange={(e) => setEditTableDraft((p) => p ? { ...p, tableNumber: e.target.value } : p)}
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
                  onChange={(e) => setEditTableDraft((p) => p ? { ...p, capacity: Number(e.target.value) } : p)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Shape</Label>
                <Select
                  value={editTableDraft.shape}
                  onValueChange={(v) => setEditTableDraft((p) => p ? { ...p, shape: v } : p)}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
                  onValueChange={(v) => setEditTableDraft((p) => p ? { ...p, status: v } : p)}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
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
            <Button variant="outline" size="sm" onClick={() => { setEditTableId(null); setEditTableDraft(null) }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTableEdit}>Save Changes</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ---------------------------------------------------------------- */}
      {/* Delete Confirmation Dialog                                        */}
      {/* ---------------------------------------------------------------- */}
      <Dialog
        open={deleteTableId !== null}
        onOpenChange={(open) => { if (!open) setDeleteTableId(null) }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete table?</DialogTitle>
            <DialogDescription>
              {deleteTargetTable
                ? `Delete "${deleteTargetTable.tableNumber}" (${deleteTargetTable.capacity} seats)? This cannot be undone.`
                : 'Are you sure you want to delete this table?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" disabled={isDeletingTable} onClick={() => setDeleteTableId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" disabled={isDeletingTable} onClick={() => void handleDeleteTableConfirm()}>
              {isDeletingTable ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
