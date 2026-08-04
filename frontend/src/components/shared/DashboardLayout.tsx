import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

const PAGE_TITLE: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/users': 'User Management',
  '/admin/floor-plan': 'Floor Plan',
  '/dashboard': 'Dashboard',
  '/orders': 'Orders',
  '/tables': 'Tables',
  '/floor': 'Floor Plan',
  '/menu': 'Menu',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/kitchen': 'Kitchen Queue',
}

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { pathname } = useLocation()
  const title =
    PAGE_TITLE[pathname] ??
    (pathname.startsWith('/admin/floor-plan/') ? 'Floor Plan' : 'DineFlow')

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center border-b border-border bg-background px-6">
          <h1 className="text-base font-semibold text-foreground">{title}</h1>
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
