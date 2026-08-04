import { cn } from '@/lib/utils'
import { useAppSelector } from '@/app/hooks'

interface AppShellProps {
  sidebar: React.ReactNode
  children: React.ReactNode
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const sidebarOpen = useAppSelector((state) => state.ui.sidebarOpen)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          'flex-shrink-0 transition-all duration-200',
          sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
        )}
      >
        {sidebar}
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
