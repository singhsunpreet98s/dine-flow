import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getPostLoginPath, LoginPage } from '@/pages/LoginPage'
import { UserRole } from '@/types/enums'
import { useAppDispatch } from '@/app/hooks'
import { useLoginMutation } from '@/features/auth/authApi'

// ── module mocks ──────────────────────────────────────────────────────────────

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}))

jest.mock('@/app/hooks', () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}))

jest.mock('@/features/auth/authApi', () => ({
  useLoginMutation: jest.fn(),
}))

// ── unit tests: getPostLoginPath ──────────────────────────────────────────────

describe('getPostLoginPath', () => {
  it('returns /setup for Admin when isSetupComplete is false', () => {
    expect(getPostLoginPath(UserRole.Admin, false)).toBe('/setup')
  })

  it('returns /dashboard for Admin when isSetupComplete is true', () => {
    expect(getPostLoginPath(UserRole.Admin, true)).toBe('/dashboard')
  })

  it('returns /dashboard for Manager', () => {
    expect(getPostLoginPath(UserRole.Manager, true)).toBe('/dashboard')
  })

  it('returns /orders for Waiter', () => {
    expect(getPostLoginPath(UserRole.Waiter, true)).toBe('/orders')
  })

  it('returns /orders for Kitchen', () => {
    expect(getPostLoginPath(UserRole.Kitchen, true)).toBe('/orders')
  })
})

// ── integration tests: LoginPage navigation ───────────────────────────────────

function buildLoginMutationMock(response: Record<string, unknown>) {
  const unwrap = jest.fn().mockResolvedValue(response)
  const loginFn = jest.fn().mockReturnValue({ unwrap })
  return loginFn
}

describe('LoginPage navigation after successful login', () => {
  const mockDispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppDispatch as jest.Mock).mockReturnValue(mockDispatch)
  })

  it('navigates to /dashboard after Admin login with setup complete', async () => {
    const loginFn = buildLoginMutationMock({
      userId: 'u1',
      name: 'Alice',
      role: UserRole.Admin,
      token: 'tok',
      isSetupComplete: true,
      timeZoneId: 'UTC',
    })
    ;(useLoginMutation as jest.Mock).mockReturnValue([loginFn, { isLoading: false }])

    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'alice@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('navigates to /orders after Waiter login', async () => {
    const loginFn = buildLoginMutationMock({
      userId: 'u2',
      name: 'Bob',
      role: UserRole.Waiter,
      token: 'tok',
      isSetupComplete: true,
      timeZoneId: 'UTC',
    })
    ;(useLoginMutation as jest.Mock).mockReturnValue([loginFn, { isLoading: false }])

    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByLabelText(/email/i), 'bob@example.com')
    await user.type(screen.getByLabelText(/password/i), 'secret123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/orders', { replace: true })
    })
  })
})
