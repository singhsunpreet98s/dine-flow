import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AccentColor =
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'slate'
  | 'pink'
  | 'red'

interface UiState {
  sidebarOpen: boolean
  activeOrderId: string | null
  theme: 'light' | 'dark'
  accentColor: AccentColor
}

const UI_STORAGE_KEY = 'dineflow_ui'

function loadUiPrefs(): Pick<UiState, 'theme' | 'accentColor'> {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return { theme: 'light', accentColor: 'blue' }
    return JSON.parse(raw) as Pick<UiState, 'theme' | 'accentColor'>
  } catch {
    return { theme: 'light', accentColor: 'blue' }
  }
}

const prefs = loadUiPrefs()

const initialState: UiState = {
  sidebarOpen: true,
  activeOrderId: null,
  theme: prefs.theme,
  accentColor: prefs.accentColor,
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
    },
    setActiveOrder(state, action: PayloadAction<string | null>) {
      state.activeOrderId = action.payload
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ theme: state.theme, accentColor: state.accentColor }),
      )
    },
    setAccentColor(state, action: PayloadAction<AccentColor>) {
      state.accentColor = action.payload
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ theme: state.theme, accentColor: state.accentColor }),
      )
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setActiveOrder, setTheme, setAccentColor } =
  uiSlice.actions
