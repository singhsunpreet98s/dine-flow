import { baseApi } from '../../app/api'

export interface SettingsDto {
  name: string
  themeAccentColor: string
}

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
  }),
})

export const { useGetSettingsQuery, useUpdateSettingsMutation } = settingsApi
