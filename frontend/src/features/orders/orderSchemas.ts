import * as yup from 'yup'
import { OrderChannel } from '@/types/enums'

export const createOrderSchema = yup.object({
  customerName: yup.string().trim().max(200).optional().default(''),
  channel: yup
    .mixed<OrderChannel>()
    .oneOf(Object.values(OrderChannel), 'Invalid channel')
    .required('Channel is required'),
  memberCount: yup
    .number()
    .typeError('Member count must be a number')
    .integer('Must be a whole number')
    .min(1, 'At least 1 member required')
    .required('Member count is required'),
  restaurantTableId: yup.string().when('channel', {
    is: OrderChannel.DineIn,
    then: (s) => s.required('Table is required for dine-in orders'),
    otherwise: (s) => s.optional(),
  }),
})

export type CreateOrderFormValues = yup.InferType<typeof createOrderSchema>
