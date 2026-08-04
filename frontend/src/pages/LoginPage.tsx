import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { useLoginMutation } from '@/features/auth/authApi'
import { UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getPostLoginPath(role: UserRole, isSetupComplete: boolean): string {
  if (role === UserRole.Admin && !isSetupComplete) return '/setup'
  if (role === UserRole.Admin) return '/admin'
  if (role === UserRole.Kitchen) return '/kitchen'
  return '/dashboard'
}

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [login, { isLoading }] = useLoginMutation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const result = await login({ email, password }).unwrap()
      dispatch(
        setCredentials({
          userId: result.userId,
          name: result.name,
          role: result.role,
          token: result.token,
          isSetupComplete: result.isSetupComplete,
        })
      )
      navigate(getPostLoginPath(result.role, result.isSetupComplete), { replace: true })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }; status?: number }
      setError(apiError?.data?.message ?? 'Login failed. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-foreground">DineFlow</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Sign in to your account</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          First time?{' '}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            Register your restaurant
          </Link>
        </p>
      </div>
    </div>
  )
}
