import { useEffect, type ReactNode } from 'react'
import { useAppSelector } from '@/app/hooks'
import { ACCENT_COLORS } from '@/lib/accentColors'

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useAppSelector((s) => s.ui.theme)
  const accentColor = useAppSelector((s) => s.ui.accentColor)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    const accent = ACCENT_COLORS.find((c) => c.id === accentColor)
    if (!accent) return

    const tokens = theme === 'dark' ? accent.dark : accent.light

    const existing = document.getElementById('dineflow-accent')
    const styleEl =
      existing ??
      (() => {
        const el = document.createElement('style')
        el.id = 'dineflow-accent'
        document.head.appendChild(el)
        return el
      })()

    styleEl.textContent = `
      :root {
        --primary: ${tokens.primary};
        --primary-foreground: ${tokens.primaryFg};
        --ring: ${tokens.ring};
      }
      .dark {
        --primary: ${tokens.primary};
        --primary-foreground: ${tokens.primaryFg};
        --ring: ${tokens.ring};
      }
    `
  }, [accentColor, theme])

  return <>{children}</>
}
