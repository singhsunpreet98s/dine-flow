import { useEffect, useRef, useState } from 'react'
import {
  useCreateMenuItemMutation,
  useGetMenuCategoriesQuery,
  useUpdateMenuItemMutation,
} from '@/features/menu/menuApi'
import type { MenuItemDto } from '@/types/api'
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from '@/components/ui/toaster'

interface MenuItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem?: MenuItemDto | null
}

interface FormValues {
  name: string
  description: string
  price: string
  categoryId: string
  isAvailable: boolean
  displayOrder: string
}

const EMPTY_FORM: FormValues = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isAvailable: true,
  displayOrder: '0',
}

export function MenuItemSheet({ open, onOpenChange, editItem }: MenuItemSheetProps) {
  const isEdit = editItem != null
  const { data: categories = [] } = useGetMenuCategoriesQuery()
  const [createMenuItem, { isLoading: isCreating }] = useCreateMenuItemMutation()
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation()
  const isLoading = isCreating || isUpdating

  const [form, setForm] = useState<FormValues>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Populate form when editing
  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name,
        description: editItem.description ?? '',
        price: editItem.price.toString(),
        categoryId: editItem.categoryId,
        isAvailable: editItem.isAvailable,
        displayOrder: editItem.displayOrder.toString(),
      })
      setImagePreview(editItem.photoUrl)
      setImageFile(null)
    } else {
      setForm(EMPTY_FORM)
      setImagePreview(null)
      setImageFile(null)
    }
    setError('')
  }, [editItem, open])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function updateField<K extends keyof FormValues>(field: K, value: FormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function buildFormData(): FormData {
    const fd = new FormData()
    fd.append('name', form.name)
    fd.append('description', form.description)
    fd.append('price', form.price)
    fd.append('categoryId', form.categoryId)
    fd.append('isAvailable', String(form.isAvailable))
    fd.append('displayOrder', form.displayOrder)
    if (imageFile) fd.append('image', imageFile)
    return fd
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      if (isEdit && editItem) {
        await updateMenuItem({ id: editItem.id, data: buildFormData() }).unwrap()
        toast.success('Menu item updated', 'Your changes have been saved.')
      } else {
        await createMenuItem(buildFormData()).unwrap()
        toast.success('Menu item added', 'The item has been added to your menu.')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError(apiError?.data?.message ?? 'Failed to save menu item.')
    }
  }

  function handleSheetChange(nextOpen: boolean) {
    if (!nextOpen) {
      setForm(EMPTY_FORM)
      setImageFile(null)
      setImagePreview(null)
      setError('')
    }
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleSheetChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
          <SheetTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the details for this menu item.'
              : 'Fill in the details to add a new item to your menu.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          {/* SCROLLABLE body — only this div scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 px-6 pb-4">
            {/* Image upload */}
            <div className="space-y-1.5">
              <Label>Photo</Label>
              <div
                className="relative flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <span className="text-2xl">📷</span>
                    <span className="text-xs">Click to upload image</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-name">Name *</Label>
              <Input
                id="mi-name"
                placeholder="e.g. Paneer Tikka"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-description">Description</Label>
              <Input
                id="mi-description"
                placeholder="Short description..."
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-price">Price (₹) *</Label>
              <Input
                id="mi-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-category">Category *</Label>
              <Select
                value={form.categoryId}
                onValueChange={(v) => updateField('categoryId', v)}
              >
                <SelectTrigger id="mi-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  No categories yet. An Admin must create a category before adding items.
                </p>
              )}
            </div>

            {/* Display order */}
            <div className="space-y-1.5">
              <Label htmlFor="mi-order">Display Order</Label>
              <Input
                id="mi-order"
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => updateField('displayOrder', e.target.value)}
              />
            </div>

            {/* Is Available toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Available</Label>
                <p className="text-xs text-muted-foreground">Visible and orderable by staff</p>
              </div>
              <button
                type="button"
                onClick={() => updateField('isAvailable', !form.isAvailable)}
                className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  form.isAvailable ? 'bg-green-500' : 'bg-muted-foreground/40'
                }`}
                aria-label="Toggle availability"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    form.isAvailable ? 'left-6' : 'left-1'
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

          {/* FIXED footer — never scrolls */}
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
              {isLoading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
