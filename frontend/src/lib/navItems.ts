import {
  LayoutDashboard,
  ClipboardList,
  LayoutGrid,
  UtensilsCrossed,
  Users,
  BarChart2,
  Settings,
  ChefHat,
  Map,
  type LucideIcon,
} from 'lucide-react'
import { UserRole } from '@/types/enums'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  [UserRole.Admin]: [
    { label: 'Dashboard',  path: '/dashboard',             icon: LayoutDashboard },
    { label: 'Orders',     path: '/orders',            icon: ClipboardList   },
    { label: 'Tables',     path: '/tables',            icon: LayoutGrid      },
    { label: 'Floor Plan', path: '/admin/floor-plan',  icon: Map             },
    { label: 'Menu',       path: '/menu',              icon: UtensilsCrossed },
    { label: 'Users',      path: '/admin/users',       icon: Users           },
    { label: 'Reports',    path: '/reports',           icon: BarChart2       },
    { label: 'Settings',   path: '/settings',          icon: Settings        },
  ],
  [UserRole.Manager]: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Orders',    path: '/orders',    icon: ClipboardList   },
    { label: 'Tables',    path: '/tables',    icon: LayoutGrid      },
    { label: 'Menu',      path: '/menu',      icon: UtensilsCrossed },
    { label: 'Reports',   path: '/reports',   icon: BarChart2       },
  ],
  [UserRole.Waiter]: [
    { label: 'Floor Plan', path: '/floor',  icon: LayoutGrid      },
    { label: 'Orders',     path: '/orders', icon: ClipboardList   },
    { label: 'Menu',       path: '/menu',   icon: UtensilsCrossed },
  ],
  [UserRole.Kitchen]: [
    { label: 'Kitchen', path: '/kitchen', icon: ChefHat },
  ],
}
