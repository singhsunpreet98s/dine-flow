import { baseApi } from '@/app/api'
import type {
  AppUserDto,
  AuthResponse,
  CreateSubUserRequest,
  LoginRequest,
  RegisterRequest,
} from '@/types/api'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
    }),
    setRestaurantName: build.mutation<void, { name: string }>({
      query: (body) => ({ url: 'auth/restaurant-name', method: 'PATCH', body }),
    }),
    createSubUser: build.mutation<AppUserDto, CreateSubUserRequest>({
      query: (body) => ({ url: 'auth/users', method: 'POST', body }),
      invalidatesTags: [{ type: 'AppUser', id: 'LIST' }],
    }),
    getUsers: build.query<AppUserDto[], void>({
      query: () => 'auth/users',
      providesTags: [{ type: 'AppUser', id: 'LIST' }],
    }),
    updateTimezone: build.mutation<AuthResponse, { timeZoneId: string }>({
      query: (body) => ({ url: 'auth/me/timezone', method: 'PATCH', body }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useSetRestaurantNameMutation,
  useCreateSubUserMutation,
  useGetUsersQuery,
  useUpdateTimezoneMutation,
} = authApi
