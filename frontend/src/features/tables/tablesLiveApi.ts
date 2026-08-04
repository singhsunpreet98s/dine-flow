import { baseApi } from '@/app/api'
import type { FloorLiveDto } from '@/types/api'

export const tablesLiveApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLiveFloors: builder.query<FloorLiveDto[], void>({
      query: () => 'floors/live',
      providesTags: ['LiveFloors'],
    }),
  }),
})

export const { useGetLiveFloorsQuery } = tablesLiveApi
