import { useAppSelector } from '@/app/hooks'
import type { UserRole } from '@/types/enums'

export function useRoleGuard(allowed: UserRole[]): boolean {
  const role = useAppSelector((state) => state.auth.role)
  return role !== null && allowed.includes(role)
}
