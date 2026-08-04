import { useEffect, useState } from 'react'
import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '@/features/menu/menuApi'
import type { MenuCategoryDto, CreateMenuCategoryRequest } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from '@/components/ui/toaster'

interface MenuCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCategory?: MenuCategoryDto | null
}

interface FormValues {
  name: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_FORM: FormValues = { name: '', sortOrder: '0', isActive: true }

export function MenuCategorySheet({ open, onOpenChange, editCategory }: MenuCategorySheetProps) {
  const isEdit = editCategory != null
  const [createCategory, { isLoading: isCreating }] = useCreateMenuCategoryMutation()
  const [updateCategory, { isLoading: isUpdating }] = useUpdateMenuCategoryMutation()
  const isLoading = isCreating || isUpdating

  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [error, setError] = useState('')

  useEffect(() => {
    if (editCategory) {
      setForm({
        name: editCategory.name,
        sortOrder: editCategory.sortOrder.toString(),
        isActive: editCategory.isActive,
      })
    } else {
      setForm(EMPTY_FORM)
    }
    setError('')
  }, [editCategory, open])

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const payload: CreateMenuCategoryRequest = {
      name: form.name.trim(),
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      isActive: form.isActive,
    }
    try {
      if (isEdit && editCategory) {
        await updateCategory({ id: editCategory.id, data: payload }).unwrap()
        toast.success('Category updated', 'Your changes have been saved.')
      } else {
        await createCategory(payload).unwrap()
        toast.success('Category added', 'The category is now available.')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError(apiError?.data?.message ?? 'Failed to save category.')
    }
  }

  function handleSheetChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(EMPTY_FORM)
      setError('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="shrink-0 px-6 pt-6 pb-4">
          <SheetTitle>{isEdit ? 'Edit Category' : 'Add Category'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update this category.' : 'Create a new menu category.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 px-6 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name *</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Starters"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Display Order</Label>
              <Input
                id="cat-order"
                type="number"
                min="0"
                value={form.sortOrder}
                onChange={(e) => updateField('sortOrder', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first.</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Show this category on the menu</p>
              </div>
              <button
                type="button"
                onClick={() => updateField('isActive', !form.isActive)}
                className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  form.isActive ? 'bg-green-500' : 'bg-muted-foreground/40'
                }`}
                aria-label="Toggle active"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.isActive ? 'left-6' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-border bg-background px-6 py-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleSheetChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
