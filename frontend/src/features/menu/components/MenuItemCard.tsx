import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDeleteMenuItemMutation, useToggleMenuItemAvailabilityMutation } from '@/features/menu/menuApi'
import type { MenuItemDto } from '@/types/api'
import { UserRole } from '@/types/enums'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { cn } from '@/lib/utils'

interface MenuItemCardProps {
  item: MenuItemDto
  onEdit: (item: MenuItemDto) => void
}

export function MenuItemCard({ item, onEdit }: MenuItemCardProps) {
  const isAdmin = useRoleGuard([UserRole.Admin])
  const canToggle = useRoleGuard([UserRole.Admin, UserRole.Manager])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteMenuItem, { isLoading: isDeleting }] = useDeleteMenuItemMutation()
  const [toggleAvailability, { isLoading: isToggling }] = useToggleMenuItemAvailabilityMutation()

  async function handleDelete() {
    try {
      await deleteMenuItem(item.id).unwrap()
      setDeleteOpen(false)
    } catch {
      // error shown via toast in a future iteration
    }
  }

  async function handleToggle() {
    try {
      await toggleAvailability(item.id).unwrap()
    } catch {
      // silent — optimistic update not used here
    }
  }

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
        {/* Image */}
        <div className="relative h-40 w-full bg-muted">
          {item.photoUrl ? (
            <img
              src={item.photoUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-4xl text-muted-foreground/30">🍽</span>
            </div>
          )}

          {/* Availability badge overlay */}
          <div className="absolute left-2 top-2">
            <Badge variant={item.isAvailable ? 'success' : 'secondary'} className="text-xs">
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </Badge>
          </div>

          {/* Admin action buttons overlay */}
          {isAdmin && (
            <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={() => onEdit(item)}
                title="Edit item"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-7 w-7"
                onClick={() => setDeleteOpen(true)}
                title="Delete item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-1 p-3">
          <p className="text-xs text-muted-foreground">{item.categoryName}</p>
          <h3 className="font-semibold leading-tight text-foreground">{item.name}</h3>
          {item.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          )}
          <div className="mt-auto flex items-center justify-between pt-2">
            <span className="text-sm font-bold text-foreground">
              ₹{item.price.toFixed(2)}
            </span>
            {canToggle && (
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  item.isAvailable ? 'bg-green-500' : 'bg-muted-foreground/40',
                  isToggling && 'cursor-not-allowed opacity-50',
                )}
                title="Toggle availability"
                aria-label="Toggle availability"
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
                    item.isAvailable ? 'left-4' : 'left-0.5',
                  )}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        itemName={item.name}
      />
    </>
  )
}
