import { baseApi } from '@/app/api'
import type { DashboardStatsDto } from './dashboardTypes'

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardStats: build.query<DashboardStatsDto, void>({
      query: () => 'dashboard/stats',
    }),
  }),
})

export const { useGetDashboardStatsQuery } = dashboardApi
