import { useAssignWaiterMutation, useGetUsersQuery } from '@/features/orders/ordersApi'
import { UserRole } from '@/types/enums'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AssignWaiterButtonProps {
  orderId: string
  assignedWaiterId: string | null
}

export function AssignWaiterButton({ orderId, assignedWaiterId }: AssignWaiterButtonProps) {
  const { data: users } = useGetUsersQuery()
  const [assignWaiter, { isLoading }] = useAssignWaiterMutation()

  const waiters = users?.filter((u) => u.role === UserRole.Waiter && u.isActive) ?? []

  function handleSelect(waiterId: string) {
    assignWaiter({ id: orderId, data: { waiterId } })
  }

  return (
    <Select
      value={assignedWaiterId ?? ''}
      onValueChange={handleSelect}
      disabled={isLoading || waiters.length === 0}
    >
      <SelectTrigger className="h-7 text-xs w-[130px]">
        <SelectValue placeholder="Assign waiter" />
      </SelectTrigger>
      <SelectContent>
        {waiters.map((w) => (
          <SelectItem key={w.id} value={w.id} className="text-xs">
            {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
