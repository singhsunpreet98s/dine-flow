import * as yup from 'yup'

export const menuCategorySchema = yup.object({
  name: yup.string().trim().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').required('Name is required'),
  sortOrder: yup.number().integer('Must be a whole number').min(0, 'Must be 0 or greater').required().default(0),
  isActive: yup.boolean().required().default(true),
})

export const menuItemSchema = yup.object({
  name: yup.string().trim().min(1, 'Name is required').max(200, 'Name must be 200 characters or less').required('Name is required'),
  description: yup.string().trim().max(500, 'Description must be 500 characters or less').optional().default(''),
  price: yup
    .number()
    .typeError('Price must be a number')
    .positive('Price must be greater than 0')
    .required('Price is required'),
  categoryId: yup.string().required('Category is required'),
  isAvailable: yup.boolean().required().default(true),
  displayOrder: yup.number().integer('Must be a whole number').min(0, 'Must be 0 or greater').required().default(0),
})

export type MenuCategoryFormValues = yup.InferType<typeof menuCategorySchema>
export type MenuItemFormValues = yup.InferType<typeof menuItemSchema>
