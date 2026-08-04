import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setCredentials } from '@/features/auth/authSlice'
import { useSetRestaurantNameMutation } from '@/features/auth/authApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function RestaurantSetupPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isSetupComplete = useAppSelector((s) => s.auth.isSetupComplete)
  const [setName, { isLoading }] = useSetRestaurantNameMutation()
  const [restaurantName, setRestaurantName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSetupComplete) navigate('/admin', { replace: true })
  }, [isSetupComplete, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await setName({ name: restaurantName }).unwrap()
      dispatch(setCredentials({ isSetupComplete: true }))
      navigate('/admin', { replace: true })
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError(apiError?.data?.message ?? 'Failed to save restaurant name.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">Welcome to DineFlow</h1>
        <p className="mb-6 text-sm text-muted-foreground">What's your restaurant called?</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="restaurantName">Restaurant Name</Label>
            <Input
              id="restaurantName"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g. The Golden Fork"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}
