import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from './store'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_API_URL ?? 'https://localhost:44385'}/api/`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Order', 'MenuItem', 'MenuCategory', 'Table', 'AppUser', 'AuditLog', 'RestaurantSettings', 'Floor', 'RestaurantTable', 'LiveFloors'],
  endpoints: () => ({}),
})
