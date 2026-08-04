import { authSlice, setCredentials, clearCredentials } from '@/features/auth/authSlice'
import { UserRole } from '@/types/enums'

const reducer = authSlice.reducer

describe('authSlice', () => {
  it('should set credentials', () => {
    const state = reducer(
      undefined,
      setCredentials({ userId: '1', name: 'Alice', role: UserRole.Manager, token: 'tok' })
    )
    expect(state.role).toBe(UserRole.Manager)
    expect(state.name).toBe('Alice')
  })

  it('should clear credentials', () => {
    const withCreds = reducer(
      undefined,
      setCredentials({ userId: '1', name: 'Alice', role: UserRole.Manager, token: 'tok' })
    )
    const cleared = reducer(withCreds, clearCredentials())
    expect(cleared.userId).toBeNull()
    expect(cleared.role).toBeNull()
  })
})
