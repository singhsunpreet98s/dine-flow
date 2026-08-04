import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  message?: string
  className?: string
}

export function ErrorMessage({ message = 'Something went wrong.', className }: ErrorMessageProps) {
  return (
    <div className={cn('rounded-md bg-destructive/10 p-4 text-sm text-destructive', className)}>
      {message}
    </div>
  )
}
