import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useGetUsersQuery } from '@/features/auth/authApi'
import type { AppUserDto } from '@/types/api'
import { UserRole } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { CreateUserForm } from '@/features/admin/components/CreateUserForm'

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
  const [sheetOpen, setSheetOpen] = useState(false)

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
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Team Member</SheetTitle>
            <SheetDescription>
              Create a new staff account. The user can sign in immediately after creation.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 py-6">
            <CreateUserForm onSuccess={() => setSheetOpen(false)} submitLabel="Create User" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
