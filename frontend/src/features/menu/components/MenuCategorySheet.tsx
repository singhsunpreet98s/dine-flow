import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import {
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
} from '@/features/menu/menuApi'
import type { MenuCategoryDto } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { menuCategorySchema, type MenuCategoryFormValues } from '@/features/menu/menuSchemas'

interface MenuCategorySheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editCategory?: MenuCategoryDto | null
}

export function MenuCategorySheet({ open, onOpenChange, editCategory }: MenuCategorySheetProps) {
  const isEdit = editCategory != null
  const [createCategory, { isLoading: isCreating }] = useCreateMenuCategoryMutation()
  const [updateCategory, { isLoading: isUpdating }] = useUpdateMenuCategoryMutation()
  const isLoading = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<MenuCategoryFormValues>({
    resolver: yupResolver(menuCategorySchema),
    defaultValues: { name: '', sortOrder: 0, isActive: true },
  })

  const isActive = watch('isActive')

  // Populate form when opening for edit, reset when opening for create
  useEffect(() => {
    if (open) {
      reset(
        editCategory
          ? { name: editCategory.name, sortOrder: editCategory.sortOrder, isActive: editCategory.isActive }
          : { name: '', sortOrder: 0, isActive: true }
      )
    }
  }, [open, editCategory, reset])

  async function handleSave(values: MenuCategoryFormValues) {
    try {
      if (isEdit && editCategory) {
        await updateCategory({ id: editCategory.id, data: values }).unwrap()
        toast.success('Category updated', 'Your changes have been saved.')
      } else {
        await createCategory(values).unwrap()
        toast.success('Category added', 'The category is now available.')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError('root', { message: apiError?.data?.message ?? 'Failed to save category.' })
    }
  }

  function handleSheetChange(nextOpen: boolean) {
    if (!nextOpen) reset({ name: '', sortOrder: 0, isActive: true })
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

        <form onSubmit={handleSubmit(handleSave)} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto space-y-5 px-6 pb-4">
            <FormField label="Name" htmlFor="cat-name" error={errors.name?.message} required>
              <Input id="cat-name" placeholder="e.g. Starters" {...register('name')} />
            </FormField>

            <FormField
              label="Display Order"
              htmlFor="cat-order"
              error={errors.sortOrder?.message}
              hint="Lower numbers appear first."
            >
              <Input id="cat-order" type="number" min="0" {...register('sortOrder')} />
            </FormField>

            <ToggleSwitch
              id="cat-active"
              label="Active"
              description="Show this category on the menu"
              checked={isActive ?? true}
              onChange={(v) => setValue('isActive', v)}
            />

            {errors.root && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.root.message}
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
