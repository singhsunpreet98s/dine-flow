import { baseApi } from '@/app/api'
import type { SettingsDto } from '@/types/api'

export type { SettingsDto }

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSettings: build.query<SettingsDto, void>({
      query: () => 'settings',
      providesTags: ['RestaurantSettings'],
    }),
    updateSettings: build.mutation<SettingsDto, Partial<SettingsDto>>({
      query: (body) => ({ url: 'settings', method: 'PATCH', body }),
      invalidatesTags: ['RestaurantSettings'],
    }),
    uploadLogo: build.mutation<{ logoUrl: string }, FormData>({
      query: (formData) => ({ url: 'settings/logo', method: 'POST', body: formData }),
      invalidatesTags: ['RestaurantSettings'],
    }),
  }),
})

export const {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useUploadLogoMutation,
} = settingsApi
