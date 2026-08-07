/**
 * Jest-compatible stub for src/app/api.ts.
 *
 * The real api.ts uses `import.meta.env.VITE_API_URL` which is Vite-specific
 * syntax that Node.js / ts-jest cannot parse.  This file exports an identical
 * baseApi using a hardcoded fallback URL so every import chain that reaches
 * @/app/api works in the test environment without any changes to test files.
 *
 * Wired into Jest via moduleNameMapper in jest.config.ts:
 *   '^@/app/api$': '<rootDir>/src/__mocks__/appApi.ts'
 *
 * NOTE: prepareHeaders (auth token injection) is intentionally omitted — tests
 * that care about auth behaviour mock the auth slice or the whole store.
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://localhost:44385/api/' }),
  tagTypes: [
    'Order',
    'MenuItem',
    'MenuCategory',
    'Table',
    'AppUser',
    'AuditLog',
    'RestaurantSettings',
    'Floor',
    'RestaurantTable',
    'LiveFloors',
  ],
  endpoints: () => ({}),
})
