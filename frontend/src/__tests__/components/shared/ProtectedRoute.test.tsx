import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getRoleHomePath, ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { useAppSelector } from '@/app/hooks'
import { UserRole } from '@/types/enums'

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/app/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(),
}))

// ── unit tests: getRoleHomePath ───────────────────────────────────────────────

describe('getRoleHomePath', () => {
  it('returns /dashboard for Admin', () => {
    expect(getRoleHomePath(UserRole.Admin)).toBe('/dashboard')
  })

  it('returns /dashboard for Manager', () => {
    expect(getRoleHomePath(UserRole.Manager)).toBe('/dashboard')
  })

  it('returns /orders for Waiter', () => {
    expect(getRoleHomePath(UserRole.Waiter)).toBe('/orders')
  })

  it('returns /orders for Kitchen', () => {
    expect(getRoleHomePath(UserRole.Kitchen)).toBe('/orders')
  })
})

// ── integration tests: ProtectedRoute redirects ───────────────────────────────

function mockAuth(token: string | null, role: UserRole | null) {
  ;(useAppSelector as jest.Mock).mockImplementation(
    (selector: (s: unknown) => unknown) => selector({ auth: { token, role } }),
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('Kitchen user visiting /orders is allowed through after route guard change', () => {
    mockAuth('tok', UserRole.Kitchen)

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/dashboard" element={<div>dashboard page</div>} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen]}
              >
                <div>orders content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('orders content')).toBeInTheDocument()
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument()
  })

  it('Waiter visiting a restricted route is redirected to /orders', () => {
    mockAuth('tok', UserRole.Waiter)

    render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/orders" element={<div>orders page</div>} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[UserRole.Admin]}>
                <div>admin users content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('orders page')).toBeInTheDocument()
    expect(screen.queryByText('admin users content')).not.toBeInTheDocument()
  })

  it('unauthenticated user is redirected to /login', () => {
    mockAuth(null, null)

    render(
      <MemoryRouter initialEntries={['/orders']}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/dashboard" element={<div>dashboard page</div>} />
          <Route
            path="/orders"
            element={
              <ProtectedRoute
                allowedRoles={[UserRole.Admin, UserRole.Manager, UserRole.Waiter, UserRole.Kitchen]}
              >
                <div>orders content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('orders content')).not.toBeInTheDocument()
  })
})
