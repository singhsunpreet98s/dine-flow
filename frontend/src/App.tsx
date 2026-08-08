import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/app/store'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { ThemeProvider } from '@/components/shared/ThemeProvider'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { RestaurantSetupPage } from '@/pages/RestaurantSetupPage'
import { UsersPage } from '@/pages/UsersPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { KitchenPage } from '@/pages/KitchenPage'
import { MenuPage } from '@/pages/MenuPage'
import { RestaurantSettingsPage } from '@/pages/RestaurantSettingsPage'
import { FloorsPage } from '@/pages/FloorsPage'
import { FloorEditorPage } from '@/pages/FloorEditorPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { AddOrderPage } from '@/pages/AddOrderPage'
import { EditOrderPage } from '@/pages/EditOrderPage'
import { TablesPage } from '@/pages/TablesPage'
import { BillPage } from '@/pages/BillPage'
import { UserRole } from '@/types/enums'
import { setAccentColor, type AccentColor } from '@/features/ui/uiSlice'
import { useGetSettingsQuery } from '@/features/settings/settingsApi'
import { useSignalR } from '@/hooks/useSignalR'
import { Toaster } from '@/components/ui/toaster'

/**
 * Mounts once inside the Redux Provider. Handles two boot-time concerns:
 * 1. Fetches restaurant settings and applies the server-persisted accent color.
 * 2. Starts the SignalR connection so SettingsUpdated reaches every client.
 *    Group assignment (including "all-users") is done server-side on connect.
 */
function AuthBootstrap() {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.token !== null)

  const { data: settingsData } = useGetSettingsQuery(undefined, {
    skip: !isAuthenticated,
  })

  useSignalR()

  useEffect(() => {
    if (settingsData) {
      dispatch(setAccentColor(settingsData.themeAccentColor as AccentColor))
    }
  }, [dispatch, settingsData])

  return null
}

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Routes>
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/floor-plan"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin]}>
              <FloorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/floor-plan/:floorId"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin]}>
              <FloorEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin]}>
              <RestaurantSettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Kitchen, UserRole.Admin]}>
              <KitchenPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <AddOrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <EditOrderPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id/bill"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <BillPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tables"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter]}>
              <TablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/floor"
          element={
            <ProtectedRoute allowedRoles={[UserRole.Waiter, UserRole.Admin]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/menu"
          element={
            <ProtectedRoute
              allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen]}
            >
              <MenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </DashboardLayout>
  )
}

export function App() {
  return (
    <Provider store={store}>
      <Toaster />
      <ThemeProvider>
        <AuthBootstrap />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/setup"
              element={
                <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                  <RestaurantSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardRoutes />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  )
}
