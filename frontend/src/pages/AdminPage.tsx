import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useCreateSubUserMutation, useGetUsersQuery } from '@/features/auth/authApi'
import type { CreateSubUserRequest } from '@/types/api'
import { UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { FloorLayoutDesigner } from '@/features/admin/components/FloorLayoutDesigner'

const SUB_ROLES = [UserRole.Manager, UserRole.Waiter, UserRole.Kitchen] as const

const EMPTY_FORM: CreateSubUserRequest = {
  name: '',
  email: '',
  password: '',
  role: UserRole.Waiter,
}

type AdminTab = 'users' | 'floor-plan'

export function AdminPage() {
  const { data: users, isLoading } = useGetUsersQuery()
  const [createSubUser, { isLoading: isCreating }] = useCreateSubUserMutation()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateSubUserRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [activeTab, setActiveTab] = useState<AdminTab>('users')

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    try {
      await createSubUser(form).unwrap()
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    } catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      setFormError(apiError?.data?.message ?? 'Failed to create user.')
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-end gap-0 border-b px-6 pt-6">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'users'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('floor-plan')}
          className={cn(
            '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'floor-plan'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Floor Plan
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button size="icon">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Add User</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => void handleCreateUser(e)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="userName">Full Name</Label>
                    <Input
                      id="userName"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="userEmail">Email</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="userPassword">Password</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm((prev) => ({ ...prev, role: v as UserRole }))}
                    >
                      <SelectTrigger>
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
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating ? 'Creating…' : 'Create User'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {users?.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'text-green-600' : 'text-muted-foreground'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Floor Plan */}
      {activeTab === 'floor-plan' && (
        <div className="flex flex-1 overflow-hidden p-6">
          <FloorLayoutDesigner />
        </div>
      )}
    </div>
  )
}
