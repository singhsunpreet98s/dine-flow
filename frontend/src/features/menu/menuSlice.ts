import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface MenuState {
  selectedCategoryId: string | null
  searchTerm: string
  currentPage: number
}

const initialState: MenuState = {
  selectedCategoryId: null,
  searchTerm: '',
  currentPage: 1,
}

export const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedCategory(state, action: PayloadAction<string | null>) {
      state.selectedCategoryId = action.payload
      state.currentPage = 1
    },
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload
      state.currentPage = 1
    },
    setCurrentPage(state, action: PayloadAction<number>) {
      state.currentPage = action.payload
    },
  },
})

export const { setSelectedCategory, setSearchTerm, setCurrentPage } = menuSlice.actions
