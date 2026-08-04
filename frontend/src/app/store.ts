import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from './api'
import { authSlice } from '@/features/auth/authSlice'
import { uiSlice } from '@/features/ui/uiSlice'
import { menuSlice } from '@/features/menu/menuSlice'

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authSlice.reducer,
    ui: uiSlice.reducer,
    menu: menuSlice.reducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
