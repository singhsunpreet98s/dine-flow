import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { useLoginMutation } from '@/features/auth/authApi'
import { UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { loginSchema, type LoginFormValues } from '@/features/auth/authSchemas'

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

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: yupResolver(loginSchema) })

  async function handleLogin(values: LoginFormValues) {
    try {
      const result = await login(values).unwrap()
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
      setError('root', { message: apiError?.data?.message ?? 'Login failed. Please try again.' })
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

        <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </FormField>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

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
