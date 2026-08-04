import * as yup from 'yup'
import { UserRole } from '@/types/enums'

export const SUB_ROLES = [UserRole.Manager, UserRole.Waiter, UserRole.Kitchen] as const
export type SubRole = (typeof SUB_ROLES)[number]

export const createUserSchema = yup.object({
  name: yup.string().trim().min(1, 'Name is required').max(100).required('Name is required'),
  email: yup.string().email('Invalid email address').required('Email is required'),
  password: yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
  role: yup.mixed<SubRole>().oneOf(SUB_ROLES, 'Invalid role').required('Role is required'),
})

export type CreateUserFormValues = yup.InferType<typeof createUserSchema>
