import { useForm, Controller } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useCreateSubUserMutation } from '@/features/auth/authApi'
import { UserRole } from '@/types/enums'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SUB_ROLES,
  createUserSchema,
  type CreateUserFormValues,
} from '@/features/admin/adminSchemas'

const ROLE_HINT: Record<(typeof SUB_ROLES)[number], string> = {
  [UserRole.Kitchen]: 'Kitchen staff see the live order queue only.',
  [UserRole.Waiter]: 'Waiters manage floor tables and take orders.',
  [UserRole.Manager]: 'Managers can view reports and manage orders.',
}

interface CreateUserFormProps {
  /** Called after the user is created successfully. Use to close the parent dialog/sheet. */
  onSuccess: () => void
  submitLabel?: string
}

export function CreateUserForm({ onSuccess, submitLabel = 'Create User' }: CreateUserFormProps) {
  const [createSubUser, { isLoading }] = useCreateSubUserMutation()

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: yupResolver(createUserSchema),
    defaultValues: { role: UserRole.Waiter },
  })

  async function handleCreate(values: CreateUserFormValues) {
    try {
      await createSubUser(values).unwrap()
      onSuccess()
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setError('root', { message: apiError?.data?.message ?? 'Failed to create user.' })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleCreate)} className="space-y-5">
      <FormField label="Full Name" htmlFor="cu-name" error={errors.name?.message} required>
        <Input id="cu-name" placeholder="e.g. Riya Sharma" {...register('name')} />
      </FormField>

      <FormField label="Email" htmlFor="cu-email" error={errors.email?.message} required>
        <Input
          id="cu-email"
          type="email"
          placeholder="staff@restaurant.com"
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="cu-password"
        error={errors.password?.message}
        required
        hint="Minimum 8 characters"
      >
        <Input id="cu-password" type="password" {...register('password')} />
      </FormField>

      <Controller
        name="role"
        control={control}
        render={({ field }) => (
          <FormField
            label="Role"
            htmlFor="cu-role"
            error={errors.role?.message}
            hint={field.value ? ROLE_HINT[field.value] : undefined}
          >
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUB_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      />

      {errors.root && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating…' : submitLabel}
      </Button>
    </form>
  )
}
