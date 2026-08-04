import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { useSetRestaurantNameMutation } from '@/features/auth/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/shared/FormField'
import { restaurantSetupSchema, type RestaurantSetupFormValues } from '@/features/auth/authSchemas'

export function RestaurantSetupPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isSetupComplete = useAppSelector((s) => s.auth.isSetupComplete)
  const [setName, { isLoading }] = useSetRestaurantNameMutation()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RestaurantSetupFormValues>({ resolver: yupResolver(restaurantSetupSchema) })

  useEffect(() => {
    if (isSetupComplete) navigate('/admin', { replace: true })
  }, [isSetupComplete, navigate])

  async function handleSetup(values: RestaurantSetupFormValues) {
    try {
      await setName({ name: values.restaurantName }).unwrap()
      dispatch(setCredentials({ isSetupComplete: true }))
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError('root', { message: apiError?.data?.message ?? 'Failed to save restaurant name.' })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Welcome to DineFlow</h1>
        <p className="mb-6 text-sm text-muted-foreground">What&apos;s your restaurant called?</p>

        <form onSubmit={handleSubmit(handleSetup)} className="space-y-4">
          <FormField
            label="Restaurant Name"
            htmlFor="restaurantName"
            error={errors.restaurantName?.message}
            required
          >
            <Input
              id="restaurantName"
              placeholder="e.g. The Golden Fork"
              {...register('restaurantName')}
            />
          </FormField>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}
