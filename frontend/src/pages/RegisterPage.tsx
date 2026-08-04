import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UtensilsCrossed } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useAppDispatch } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { useRegisterMutation } from '@/features/auth/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { registerSchema, type RegisterFormValues } from '@/features/auth/authSchemas'

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()
  const [adminExists, setAdminExists] = useState(false)

  const {
    register: rhfRegister,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: yupResolver(registerSchema) })

  async function handleRegister(values: RegisterFormValues) {
    try {
      const result = await register({
        name: values.name,
        email: values.email,
        password: values.password,
      }).unwrap()
      dispatch(
        setCredentials({
          userId: result.userId,
          name: result.name,
          role: result.role,
          token: result.token,
          isSetupComplete: result.isSetupComplete,
        })
      )
      navigate('/setup', { replace: true })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string }; status?: number }
      if (apiError?.status === 409) {
        setAdminExists(true)
      } else {
        setError('root', {
          message: apiError?.data?.message ?? 'Registration failed. Please try again.',
        })
      }
    }
  }

  if (adminExists) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-md text-center">
          <div className="mb-6 flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
              <UtensilsCrossed className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">DineFlow</h1>
          </div>
          <p className="mb-6 text-sm text-muted-foreground">
            An admin account already exists for this restaurant.
          </p>
          <Link to="/login">
            <Button className="w-full">Go to Login</Button>
          </Link>
        </div>
      </div>
    )
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
            <p className="mt-0.5 text-sm text-muted-foreground">Create your admin account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleRegister)} className="space-y-4">
          <FormField label="Full Name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" {...rhfRegister('name')} />
          </FormField>

          <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" autoComplete="email" {...rhfRegister('email')} />
          </FormField>

          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...rhfRegister('password')}
            />
          </FormField>

          <FormField
            label="Confirm Password"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
            required
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...rhfRegister('confirmPassword')}
            />
          </FormField>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
