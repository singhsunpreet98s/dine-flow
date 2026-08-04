import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateSubUserMutation, useGetUsersQuery } from '@/features/auth/authApi'
import type { AppUserDto, CreateSubUserRequest } from '@/types/api'
import { UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { DataTable, type ColumnDef } from '@/components/shared/DataTable'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const SUB_ROLES = [UserRole.Manager, UserRole.Waiter, UserRole.Kitchen] as const

const EMPTY_FORM: CreateSubUserRequest = {
  name: '',
  email: '',
  password: '',
  role: UserRole.Waiter,
}

const ROLE_BADGE: Record<UserRole, string> = {
  [UserRole.Admin]:   'purple',
  [UserRole.Manager]: 'info',
  [UserRole.Waiter]:  'orange',
  [UserRole.Kitchen]: 'success',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const COLUMNS: ColumnDef<AppUserDto>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: (row) => (
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {getInitials(row.name)}
        </div>
        <span className="font-medium text-foreground">{row.name}</span>
      </div>
    ),
  },
  {
    id: 'email',
    header: 'Email',
    cell: (row) => <span className="text-muted-foreground">{row.email}</span>,
  },
  {
    id: 'role',
    header: 'Role',
    cell: (row) => (
      <Badge variant={ROLE_BADGE[row.role] as Parameters<typeof Badge>[0]['variant']}>
        {row.role}
      </Badge>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => (
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            row.isActive ? 'bg-green-500' : 'bg-muted-foreground',
          )}
        />
        <span className={cn('text-sm', row.isActive ? 'text-foreground' : 'text-muted-foreground')}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
    ),
  },
]

export function UsersPage() {
  const { data: users = [], isLoading, isError } = useGetUsersQuery()
  const [createSubUser, { isLoading: isCreating }] = useCreateSubUserMutation()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<CreateSubUserRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  function handleSheetChange(open: boolean) {
    setSheetOpen(open)
    if (!open) {
      setForm(EMPTY_FORM)
      setFormError('')
    }
  }

  function updateField<K extends keyof CreateSubUserRequest>(
    field: K,
    value: CreateSubUserRequest[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    try {
      await createSubUser(form).unwrap()
      handleSheetChange(false)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setFormError(apiError?.data?.message ?? 'Failed to create user.')
    }
  }

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Team Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage staff accounts, roles, and access.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add User</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Users table */}
      <DataTable
        columns={COLUMNS}
        rows={users}
        getRowKey={(u) => u.id}
        pageSize={10}
        isLoading={isLoading}
        isError={isError}
        emptyMessage="No team members yet. Add your first staff member above."
      />

      {/* Add user sheet */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Team Member</SheetTitle>
            <SheetDescription>
              Create a new staff account. The user can sign in immediately after creation.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleCreateUser} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <Label htmlFor="sf-name">Full Name</Label>
                <Input
                  id="sf-name"
                  placeholder="e.g. Riya Sharma"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sf-email">Email</Label>
                <Input
                  id="sf-email"
                  type="email"
                  placeholder="staff@restaurant.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sf-password">Password</Label>
                <Input
                  id="sf-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sf-role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => updateField('role', v as UserRole)}
                >
                  <SelectTrigger id="sf-role">
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
                <p className="text-xs text-muted-foreground">
                  {form.role === UserRole.Kitchen && 'Kitchen staff see the live order queue only.'}
                  {form.role === UserRole.Waiter && 'Waiters manage floor tables and take orders.'}
                  {form.role === UserRole.Manager && 'Managers can view reports and manage orders.'}
                </p>
              </div>

              {formError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              )}
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleSheetChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isCreating}>
                {isCreating ? 'Creating…' : 'Create User'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
