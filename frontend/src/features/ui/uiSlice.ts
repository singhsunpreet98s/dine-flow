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

function loadUiPrefs(): Pick<UiState, 'sidebarOpen' | 'theme' | 'accentColor'> {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY)
    if (!raw) return { sidebarOpen: true, theme: 'light', accentColor: 'blue' }
    const parsed = JSON.parse(raw) as Partial<Pick<UiState, 'sidebarOpen' | 'theme' | 'accentColor'>>
    return {
      sidebarOpen: parsed.sidebarOpen ?? true,
      theme: parsed.theme ?? 'light',
      accentColor: parsed.accentColor ?? 'blue',
    }
  } catch {
    return { sidebarOpen: true, theme: 'light', accentColor: 'blue' }
  }
}

const prefs = loadUiPrefs()

const initialState: UiState = {
  sidebarOpen: prefs.sidebarOpen,
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
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ sidebarOpen: state.sidebarOpen, theme: state.theme, accentColor: state.accentColor }),
      )
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ sidebarOpen: state.sidebarOpen, theme: state.theme, accentColor: state.accentColor }),
      )
    },
    setActiveOrder(state, action: PayloadAction<string | null>) {
      state.activeOrderId = action.payload
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ sidebarOpen: state.sidebarOpen, theme: state.theme, accentColor: state.accentColor }),
      )
    },
    setAccentColor(state, action: PayloadAction<AccentColor>) {
      state.accentColor = action.payload
      localStorage.setItem(
        UI_STORAGE_KEY,
        JSON.stringify({ sidebarOpen: state.sidebarOpen, theme: state.theme, accentColor: state.accentColor }),
      )
    },
  },
})

export const { toggleSidebar, setSidebarOpen, setActiveOrder, setTheme, setAccentColor } =
  uiSlice.actions
