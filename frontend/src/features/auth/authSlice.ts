import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { UserRole } from '@/types/enums'

interface AuthState {
  userId: string | null
  name: string | null
  role: UserRole | null
  token: string | null
  isSetupComplete: boolean
  timeZoneId: string
}

const STORAGE_KEY = 'dineflow_auth'

const defaultState: AuthState = {
  userId: null,
  name: null,
  role: null,
  token: null,
  isSetupComplete: false,
  timeZoneId: 'UTC',
}

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...(JSON.parse(raw) as Partial<AuthState>) }
  } catch {
    return defaultState
  }
}

export const authSlice = createSlice({
  name: 'auth',
  initialState: loadFromStorage,
  reducers: {
    setCredentials(state, action: PayloadAction<Partial<AuthState>>) {
      const next = { ...state, ...action.payload } as AuthState
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    },
    clearCredentials() {
      localStorage.removeItem(STORAGE_KEY)
      return defaultState
    },
  },
})

export const { setCredentials, clearCredentials } = authSlice.actions
