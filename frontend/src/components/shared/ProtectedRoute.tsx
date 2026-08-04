import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { UserRole } from '@/types/enums'

function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case UserRole.Admin:
      return '/admin'
    case UserRole.Kitchen:
      return '/kitchen'
    default:
      return '/dashboard'
  }
}

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
  children: ReactNode
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { token, role } = useAppSelector((s) => s.auth)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleHomePath(role)} replace />
  }

  return <>{children}</>
}
