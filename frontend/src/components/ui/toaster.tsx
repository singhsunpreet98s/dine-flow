import { useEffect, useState } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Simple imperative toast — stores queued toasts in module scope
type ToastItem = { id: string; title: string; description?: string; variant: 'success' | 'error' | 'info' }
let _listeners: Array<(toasts: ToastItem[]) => void> = []
let _toasts: ToastItem[] = []

function notify(listeners: typeof _listeners, toasts: typeof _toasts) {
  listeners.forEach((l) => l([...toasts]))
}

export const toast = {
  success(title: string, description?: string) {
    const id = Math.random().toString(36).slice(2)
    _toasts = [..._toasts, { id, title, description, variant: 'success' }]
    notify(_listeners, _toasts)
    setTimeout(() => {
      _toasts = _toasts.filter((t) => t.id !== id)
      notify(_listeners, _toasts)
    }, 4000)
  },
  error(title: string, description?: string) {
    const id = Math.random().toString(36).slice(2)
    _toasts = [..._toasts, { id, title, description, variant: 'error' }]
    notify(_listeners, _toasts)
    setTimeout(() => {
      _toasts = _toasts.filter((t) => t.id !== id)
      notify(_listeners, _toasts)
    }, 5000)
  },
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.push(setToasts)
    return () => {
      _listeners = _listeners.filter((l) => l !== setToasts)
    }
  }, [])

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              _toasts = _toasts.filter((x) => x.id !== t.id)
              notify(_listeners, _toasts)
            }
          }}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4',
            t.variant === 'success' && 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
            t.variant === 'error' && 'border-destructive/30 bg-destructive/10 text-destructive',
            t.variant === 'info' && 'border-border bg-card text-foreground',
          )}
        >
          <div className="flex-1 space-y-0.5">
            <ToastPrimitive.Title className="text-sm font-semibold">{t.title}</ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="text-xs opacity-80">{t.description}</ToastPrimitive.Description>
            )}
          </div>
          <ToastPrimitive.Close className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-96 flex-col gap-2" />
    </ToastPrimitive.Provider>
  )
}
