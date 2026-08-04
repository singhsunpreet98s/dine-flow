import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { ErrorMessage } from '@/components/shared/ErrorMessage'
import { toast } from '@/components/ui/toaster'
import { useGetFloorsQuery, useCreateFloorMutation } from '@/features/admin/api/floorApi'

export function FloorsPage() {
  const navigate = useNavigate()
  const { data: floors, isLoading, isError } = useGetFloorsQuery()
  const [createFloor, { isLoading: isCreating }] = useCreateFloorMutation()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newFloorName, setNewFloorName] = useState('')

  async function handleCreate() {
    const trimmed = newFloorName.trim()
    if (!trimmed) return
    try {
      const result = await createFloor({
        name: trimmed,
        displayOrder: floors?.length ?? 0,
      }).unwrap()
      setIsDialogOpen(false)
      setNewFloorName('')
      navigate(`/admin/floor-plan/${result.id}`)
    } catch {
      toast.error('Failed to create floor')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleCreate()
    else if (e.key === 'Escape') setIsDialogOpen(false)
  }

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorMessage message="Failed to load floors." />

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Floors</h2>
          <p className="text-sm text-muted-foreground">
            Manage seating areas and table layouts
          </p>
        </div>
        <Button size="sm" onClick={() => { setNewFloorName(''); setIsDialogOpen(true) }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Floor
        </Button>
      </div>

      {/* Floors table */}
      {floors && floors.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Floor Name</TableHead>
                <TableHead>Tables</TableHead>
                <TableHead>Available</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {floors.map((floor) => {
                const available = floor.tables.filter((t) => t.status === 'Available').length
                return (
                  <TableRow key={floor.id}>
                    <TableCell className="font-medium">{floor.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{floor.tables.length} tables</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {available} / {floor.tables.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => navigate(`/admin/floor-plan/${floor.id}`)}
                              aria-label="Edit Layout"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Layout</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <LayoutGrid className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No floors yet. Add your first floor to start designing.
          </p>
          <Button size="sm" onClick={() => { setNewFloorName(''); setIsDialogOpen(true) }}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Floor
          </Button>
        </div>
      )}

      {/* Add Floor Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Floor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-floor-name">Floor Name</Label>
            <Input
              id="new-floor-name"
              placeholder="e.g. Ground Floor, Rooftop, Outdoor…"
              value={newFloorName}
              onChange={(e) => setNewFloorName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => void handleCreate()}
              disabled={isCreating || !newFloorName.trim()}
            >
              {isCreating ? 'Creating…' : 'Create & Edit Layout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
