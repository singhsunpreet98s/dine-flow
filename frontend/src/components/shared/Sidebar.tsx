import { NavLink, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  UtensilsCrossed,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { toggleSidebar } from '@/features/ui/uiSlice'
import { setTheme } from '@/features/ui/uiSlice'
import { clearCredentials } from '@/features/auth/authSlice'
import { NAV_ITEMS } from '@/lib/navItems'
import { UserRole } from '@/types/enums'
import { cn } from '@/lib/utils'

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

interface UserAvatarProps {
  name: string | null
  size?: 'sm' | 'md'
}

function UserAvatar({ name, size = 'md' }: UserAvatarProps) {
  return (
    <div
      className={cn(
        'shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary flex',
        size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-xs',
      )}
    >
      {getInitials(name)}
    </div>
  )
}

export function Sidebar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { sidebarOpen, theme } = useAppSelector((s) => s.ui)
  const { name, role } = useAppSelector((s) => s.auth)

  // `role` is typed as UserRole | null, but at runtime the localStorage value
  // may be stale, lowercase, or otherwise out-of-range. Guard defensively.
  const resolvedRole = role !== null && role in NAV_ITEMS ? role : UserRole.Kitchen
  const items = NAV_ITEMS[resolvedRole] ?? []

  function handleLogout() {
    dispatch(clearCredentials())
    navigate('/login', { replace: true })
  }

  function handleThemeToggle() {
    dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))
  }

  return (
    <aside
      className={cn(
        'relative flex h-screen flex-col border-r border-border bg-card text-card-foreground transition-all duration-300 ease-in-out',
        sidebarOpen ? 'w-60' : 'w-[68px]',
      )}
    >
      {/* Floating collapse button on the right edge */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className="absolute -right-3 top-[1.375rem] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {sidebarOpen ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {/* Logo / branding */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-border',
          sidebarOpen ? 'gap-3 px-5' : 'justify-center',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
          <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
              DineFlow
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">Restaurant Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="scrollbar-none flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/admin' || item.path === '/dashboard'}
                  title={!sidebarOpen ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
                      sidebarOpen ? 'px-3' : 'w-full justify-center px-0',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && sidebarOpen && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-2 py-2 space-y-0.5">
        {/* Theme toggle */}
        <button
          onClick={handleThemeToggle}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className={cn(
            'flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
            sidebarOpen ? 'px-3' : 'justify-center px-0',
          )}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4 shrink-0" />
          ) : (
            <Sun className="h-4 w-4 shrink-0" />
          )}
          {sidebarOpen && (
            <span className="truncate">
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </span>
          )}
        </button>

        {/* User row — expanded */}
        {sidebarOpen ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
            <UserAvatar name={name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-none text-foreground">
                {name ?? '—'}
              </p>
              <p className="mt-0.5 text-[10px] capitalize text-muted-foreground">{role ?? ''}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* User row — collapsed */
          <>
            <div className="flex justify-center py-1">
              <UserAvatar name={name} size="sm" />
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex h-9 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
