import { baseApi } from '@/app/api'
import type {
  MenuCategoryDto,
  MenuItemDto,
  PagedResult,
  CreateMenuCategoryRequest,
  UpdateMenuCategoryRequest,
  MenuItemQueryParams,
} from '@/types/api'

export const menuApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Categories
    getMenuCategories: build.query<MenuCategoryDto[], void>({
      query: () => 'menu/categories',
      providesTags: [{ type: 'MenuCategory' as const, id: 'LIST' }],
    }),
    createMenuCategory: build.mutation<MenuCategoryDto, CreateMenuCategoryRequest>({
      query: (body) => ({ url: 'menu/categories', method: 'POST', body }),
      invalidatesTags: [{ type: 'MenuCategory', id: 'LIST' }],
    }),
    updateMenuCategory: build.mutation<MenuCategoryDto, { id: string; data: UpdateMenuCategoryRequest }>({
      query: ({ id, data }) => ({ url: `menu/categories/${id}`, method: 'PUT', body: data }),
      invalidatesTags: [{ type: 'MenuCategory', id: 'LIST' }],
    }),
    deleteMenuCategory: build.mutation<void, string>({
      query: (id) => ({ url: `menu/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'MenuCategory', id: 'LIST' }],
    }),
    // Items
    getMenuItems: build.query<PagedResult<MenuItemDto>, MenuItemQueryParams>({
      query: ({ categoryId, search, page, pageSize }) => ({
        url: 'menu/items',
        params: { categoryId, search, page, pageSize },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'MenuItem' as const, id })),
              { type: 'MenuItem' as const, id: 'LIST' },
            ]
          : [{ type: 'MenuItem' as const, id: 'LIST' }],
    }),
    getMenuItem: build.query<MenuItemDto, string>({
      query: (id) => `menu/items/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'MenuItem' as const, id }],
    }),
    createMenuItem: build.mutation<MenuItemDto, FormData>({
      query: (body) => ({ url: 'menu/items', method: 'POST', body }),
      invalidatesTags: [{ type: 'MenuItem', id: 'LIST' }],
    }),
    updateMenuItem: build.mutation<MenuItemDto, { id: string; data: FormData }>({
      query: ({ id, data }) => ({ url: `menu/items/${id}`, method: 'PUT', body: data }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'MenuItem', id },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),
    deleteMenuItem: build.mutation<void, string>({
      query: (id) => ({ url: `menu/items/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'MenuItem', id },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),
    toggleMenuItemAvailability: build.mutation<MenuItemDto, string>({
      query: (id) => ({ url: `menu/items/${id}/availability`, method: 'PATCH' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'MenuItem', id },
        { type: 'MenuItem', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetMenuCategoriesQuery,
  useCreateMenuCategoryMutation,
  useUpdateMenuCategoryMutation,
  useDeleteMenuCategoryMutation,
  useGetMenuItemsQuery,
  useGetMenuItemQuery,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useDeleteMenuItemMutation,
  useToggleMenuItemAvailabilityMutation,
} = menuApi
