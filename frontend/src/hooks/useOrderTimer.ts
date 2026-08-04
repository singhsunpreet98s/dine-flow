import { useState, useEffect } from 'react'
import { differenceInMinutes } from 'date-fns'
import { toUtcDate } from '@/lib/timezone'

export function useOrderTimer(placedAt: string, redThresholdMinutes = 15) {
  const [elapsed, setElapsed] = useState(
    differenceInMinutes(new Date(), toUtcDate(placedAt))
  )

  useEffect(() => {
    const id = setInterval(
      () => setElapsed(differenceInMinutes(new Date(), toUtcDate(placedAt))),
      30_000
    )
    return () => clearInterval(id)
  }, [placedAt])

  return { elapsed, isDelayed: elapsed >= redThresholdMinutes }
}
