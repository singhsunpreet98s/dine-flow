import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Tag } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setCurrentPage, setSearchTerm, setSelectedCategory } from '@/features/menu/menuSlice'
import {
  useDeleteMenuCategoryMutation,
  useGetMenuCategoriesQuery,
  useGetMenuItemsQuery,
} from '@/features/menu/menuApi'
import { MenuItemCard } from '@/features/menu/components/MenuItemCard'
import { MenuItemSheet } from '@/features/menu/components/MenuItemSheet'
import { MenuCategorySheet } from '@/features/menu/components/MenuCategorySheet'
import type { MenuCategoryDto, MenuItemDto } from '@/types/api'
import { UserRole } from '@/types/enums'
import { useRoleGuard } from '@/hooks/useRoleGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 12

export function MenuPage() {
  const dispatch = useAppDispatch()
  const { selectedCategoryId, searchTerm, currentPage } = useAppSelector((s) => s.menu)
  const isAdmin = useRoleGuard([UserRole.Admin])

  // Debounced search — local input drives Redux only after 300ms of quiet
  const [localSearch, setLocalSearch] = useState(searchTerm)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      dispatch(setSearchTerm(localSearch))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [localSearch, dispatch])

  const { data: categories = [] } = useGetMenuCategoriesQuery()
  const { data: pagedResult, isLoading, isError } = useGetMenuItemsQuery({
    categoryId: selectedCategoryId ?? undefined,
    search: searchTerm || undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
  })

  const items = pagedResult?.items ?? []
  const totalPages = pagedResult?.totalPages ?? 1

  // Menu item sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editItem, setEditItem] = useState<MenuItemDto | null>(null)

  // Category sheet state
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<MenuCategoryDto | null>(null)

  const [deleteCategory] = useDeleteMenuCategoryMutation()
  // deleteCategory is available for future use (e.g. a delete button in the category pill)
  void deleteCategory

  function handleAddItem() {
    setEditItem(null)
    setSheetOpen(true)
  }

  const handleEditItem = useCallback((item: MenuItemDto) => {
    setEditItem(item)
    setSheetOpen(true)
  }, [])

  function handleSheetChange(open: boolean) {
    setSheetOpen(open)
    if (!open) setEditItem(null)
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Menu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse and manage your restaurant's menu items.
          </p>
        </div>
        {isAdmin && (
          <TooltipProvider>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => { setEditCategory(null); setCategorySheetOpen(true) }}
                  >
                    <Tag className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Category</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" onClick={handleAddItem}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Item</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Search + Category filters */}
      <div className="mb-6 space-y-3">
        <Input
          placeholder="Search menu items..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => dispatch(setSelectedCategory(null))}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              selectedCategoryId === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="group relative">
              <button
                onClick={() => dispatch(setSelectedCategory(cat.id))}
                className={cn(
                  'rounded-full px-4 py-1.5 text-sm font-medium transition-colors pr-7',
                  selectedCategoryId === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {cat.name}
                {cat.itemCount > 0 && (
                  <span className="ml-1 text-xs opacity-70">({cat.itemCount})</span>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditCategory(cat)
                    setCategorySheetOpen(true)
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-muted-foreground hover:text-foreground"
                  title="Edit category"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : isError ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-destructive">
            Failed to load menu items. Please try again.
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            {searchTerm || selectedCategoryId
              ? 'No items match your filter.'
              : 'No menu items yet. Add your first item above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <MenuItemCard key={item.id} item={item} onEdit={handleEditItem} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setCurrentPage(currentPage - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? 'default' : 'outline'}
              size="sm"
              onClick={() => dispatch(setCurrentPage(page))}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setCurrentPage(currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add / Edit item sheet */}
      <MenuItemSheet
        open={sheetOpen}
        onOpenChange={handleSheetChange}
        editItem={editItem}
      />

      {/* Add / Edit category sheet */}
      <MenuCategorySheet
        open={categorySheetOpen}
        onOpenChange={(open) => {
          setCategorySheetOpen(open)
          if (!open) setEditCategory(null)
        }}
        editCategory={editCategory}
      />
    </div>
  )
}
