import { baseApi } from '@/app/api'
import type {
  FloorDto,
  CreateFloorPayload,
  UpdateFloorPayload,
  CreateTablePayload,
  UpdateTablePayload,
  SaveLayoutRequest,
} from '@/types/api'

export const floorApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getFloors: build.query<FloorDto[], void>({
      query: () => 'floors',
      providesTags: [{ type: 'Floor' as const, id: 'LIST' }],
    }),

    createFloor: build.mutation<FloorDto, CreateFloorPayload>({
      query: (body) => ({ url: 'floors', method: 'POST', body }),
      invalidatesTags: [{ type: 'Floor', id: 'LIST' }],
    }),

    updateFloor: build.mutation<FloorDto, { id: string } & UpdateFloorPayload>({
      query: ({ id, ...body }) => ({ url: `floors/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Floor', id: 'LIST' }],
    }),

    deleteFloor: build.mutation<void, string>({
      query: (id) => ({ url: `floors/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Floor', id: 'LIST' }],
    }),

    createTable: build.mutation<FloorDto, CreateTablePayload>({
      query: ({ floorId, ...body }) => ({
        url: `floors/${floorId}/tables`,
        method: 'POST',
        body: { ...body, floorId },
      }),
    }),

    updateTable: build.mutation<FloorDto, { id: string } & UpdateTablePayload>({
      query: ({ id, ...body }) => ({ url: `floors/tables/${id}`, method: 'PUT', body }),
    }),

    deleteTable: build.mutation<void, string>({
      query: (id) => ({ url: `floors/tables/${id}`, method: 'DELETE' }),
    }),

    saveLayout: build.mutation<void, SaveLayoutRequest>({
      query: ({ floorId, ...body }) => ({
        url: `floors/${floorId}/layout`,
        method: 'PUT',
        body: { floorId, ...body },
      }),
    }),
  }),
})

export const {
  useGetFloorsQuery,
  useCreateFloorMutation,
  useUpdateFloorMutation,
  useDeleteFloorMutation,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useSaveLayoutMutation,
} = floorApi
