import * as yup from 'yup'

export const loginSchema = yup.object({
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup.string().min(1, 'Password is required').required('Password is required'),
})

export const registerSchema = yup.object({
  name: yup.string().trim().min(1, 'Name is required').max(100).required('Name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
})

export const restaurantSetupSchema = yup.object({
  restaurantName: yup
    .string()
    .trim()
    .min(1, 'Restaurant name is required')
    .max(100, 'Name must be 100 characters or less')
    .required('Restaurant name is required'),
})

export type LoginFormValues = yup.InferType<typeof loginSchema>
export type RegisterFormValues = yup.InferType<typeof registerSchema>
export type RestaurantSetupFormValues = yup.InferType<typeof restaurantSetupSchema>
