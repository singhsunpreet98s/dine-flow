import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import {
  useCreateMenuItemMutation,
  useGetMenuCategoriesQuery,
  useUpdateMenuItemMutation,
} from '@/features/menu/menuApi'
import type { MenuItemDto } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { FormField } from '@/components/shared/FormField'
import { ToggleSwitch } from '@/components/shared/ToggleSwitch'
import { toast } from '@/components/ui/toaster'
import { menuItemSchema, type MenuItemFormValues } from '@/features/menu/menuSchemas'

interface MenuItemSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editItem?: MenuItemDto | null
}

const DEFAULT_VALUES: MenuItemFormValues = {
  name: '',
  description: '',
  price: 0,
  categoryId: '',
  isAvailable: true,
  displayOrder: 0,
}

export function MenuItemSheet({ open, onOpenChange, editItem }: MenuItemSheetProps) {
  const isEdit = editItem != null
  const { data: categories = [] } = useGetMenuCategoriesQuery()
  const [createMenuItem, { isLoading: isCreating }] = useCreateMenuItemMutation()
  const [updateMenuItem, { isLoading: isUpdating }] = useUpdateMenuItemMutation()
  const isLoading = isCreating || isUpdating

  // Image state is managed outside RHF — file inputs can't be registered with RHF
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<MenuItemFormValues>({
    resolver: yupResolver(menuItemSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const isAvailable = watch('isAvailable')

  useEffect(() => {
    if (open) {
      reset(
        editItem
          ? {
              name: editItem.name,
              description: editItem.description ?? '',
              price: editItem.price,
              categoryId: editItem.categoryId,
              isAvailable: editItem.isAvailable,
              displayOrder: editItem.displayOrder,
            }
          : DEFAULT_VALUES
      )
      setImagePreview(editItem?.photoUrl ?? null)
      setImageFile(null)
    }
  }, [open, editItem, reset])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function buildFormData(values: MenuItemFormValues): FormData {
    const fd = new FormData()
    fd.append('name', values.name)
    fd.append('description', values.description ?? '')
    fd.append('price', String(values.price))
    fd.append('categoryId', values.categoryId)
    fd.append('isAvailable', String(values.isAvailable))
    fd.append('displayOrder', String(values.displayOrder))
    if (imageFile) fd.append('image', imageFile)
    return fd
  }

  async function handleSave(values: MenuItemFormValues) {
    try {
      if (isEdit && editItem) {
        await updateMenuItem({ id: editItem.id, data: buildFormData(values) }).unwrap()
        toast.success('Menu item updated', 'Your changes have been saved.')
      } else {
        await createMenuItem(buildFormData(values)).unwrap()
        toast.success('Menu item added', 'The item has been added to your menu.')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError('root', { message: apiError?.data?.message ?? 'Failed to save menu item.' })
    }
  }

  function handleSheetChange(nextOpen: boolean) {
    if (!nextOpen) {
      reset(DEFAULT_VALUES)
      setImageFile(null)
      setImagePreview(null)
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

        <form onSubmit={handleSubmit(handleSave)} className="flex flex-1 flex-col min-h-0">
          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 px-6 pb-4">
            {/* Image upload — not a registered RHF field */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium leading-none">Photo</span>
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

            <FormField label="Name" htmlFor="mi-name" error={errors.name?.message} required>
              <Input id="mi-name" placeholder="e.g. Paneer Tikka" {...register('name')} />
            </FormField>

            <FormField
              label="Description"
              htmlFor="mi-description"
              error={errors.description?.message}
            >
              <Input
                id="mi-description"
                placeholder="Short description..."
                {...register('description')}
              />
            </FormField>

            <FormField label="Price (₹)" htmlFor="mi-price" error={errors.price?.message} required>
              <Input
                id="mi-price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                {...register('price')}
              />
            </FormField>

            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <FormField
                  label="Category"
                  htmlFor="mi-category"
                  error={errors.categoryId?.message}
                  required
                  hint={
                    categories.length === 0
                      ? 'No categories yet. An Admin must create a category first.'
                      : undefined
                  }
                >
                  <Select value={field.value} onValueChange={field.onChange}>
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
                </FormField>
              )}
            />

            <FormField
              label="Display Order"
              htmlFor="mi-order"
              error={errors.displayOrder?.message}
              hint="Lower numbers appear first."
            >
              <Input id="mi-order" type="number" min="0" {...register('displayOrder')} />
            </FormField>

            <ToggleSwitch
              id="mi-available"
              label="Available"
              description="Visible and orderable by staff"
              checked={isAvailable ?? true}
              onChange={(v) => setValue('isAvailable', v)}
            />

            {errors.root && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
              </p>
            )}
          </div>

          {/* Fixed footer */}
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
