import { baseApi } from '@/app/api'
import type { TableDto } from '@/types/api'

export const tablesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTables: build.query<TableDto[], void>({
      query: () => 'tables',
      providesTags: [{ type: 'Table' as const, id: 'LIST' }],
    }),
    getTable: build.query<TableDto, string>({
      query: (id) => `tables/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Table' as const, id }],
    }),
  }),
})

export const { useGetTablesQuery, useGetTableQuery } = tablesApi
