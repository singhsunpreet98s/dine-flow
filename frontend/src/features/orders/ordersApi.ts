import { baseApi } from '@/app/api'
import type { OrderDto, CreateOrderRequest, AddItemsRequest, AssignWaiterRequest, AppUserDto } from '@/types/api'
import type { OrderStatus } from '@/types/enums'

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<OrderDto[], void>({
      query: () => 'orders',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Order' as const, id })), { type: 'Order' as const, id: 'LIST' }]
          : [{ type: 'Order' as const, id: 'LIST' }],
    }),
    getOrder: build.query<OrderDto, string>({
      query: (id) => `orders/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Order' as const, id }],
    }),
    updateOrderStatus: build.mutation<OrderDto, { id: string; status: OrderStatus }>({
      query: ({ id, status }) => ({
        url: `orders/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Order' as const, id }],
    }),
    createOrder: build.mutation<OrderDto, CreateOrderRequest>({
      query: (body) => ({ url: 'orders', method: 'POST', body }),
      invalidatesTags: [{ type: 'Order' as const, id: 'LIST' }],
    }),
    addItemsToOrder: build.mutation<OrderDto, { id: string; data: AddItemsRequest }>({
      query: ({ id, data }) => ({ url: `orders/${id}/items`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Order' as const, id }],
    }),
    assignWaiter: build.mutation<OrderDto, { id: string; data: AssignWaiterRequest }>({
      query: ({ id, data }) => ({ url: `orders/${id}/assign-waiter`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'Order' as const, id }],
    }),
    getUsers: build.query<AppUserDto[], void>({
      query: () => 'auth/users',
    }),
  }),
})

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  useUpdateOrderStatusMutation,
  useCreateOrderMutation,
  useAddItemsToOrderMutation,
  useAssignWaiterMutation,
  useGetUsersQuery,
} = ordersApi
