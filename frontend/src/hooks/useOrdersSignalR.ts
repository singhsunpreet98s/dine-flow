import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { getSignalRConnection, startSignalRConnection } from '@/app/signalr'
import { ordersApi } from '@/features/orders/ordersApi'
import { UserRole } from '@/types/enums'
import type { OrderPlacedDto, WaiterAssignedDto } from '@/types/api'

export function useOrdersSignalR() {
  const dispatch = useAppDispatch()
  const userId = useAppSelector((s) => s.auth.userId)
  const role = useAppSelector((s) => s.auth.role)

  useEffect(() => {
    if (!userId || !role) return

    const conn = getSignalRConnection()
    startSignalRConnection().catch(() => { /* reconnect handles it */ })

    const handleOrderPlaced = (dto: OrderPlacedDto) => {
      if (role === UserRole.Admin || role === UserRole.Manager) {
        dispatch(
          ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
            if (!draft.find((o) => o.id === dto.order.id)) {
              draft.push(dto.order)
            }
          })
        )
      }
    }

    const handleWaiterAssigned = (dto: WaiterAssignedDto) => {
      if (role === UserRole.Admin || role === UserRole.Manager) {
        dispatch(
          ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
            const existing = draft.find((o) => o.id === dto.order.id)
            if (existing) {
              existing.assignedWaiterId = dto.order.assignedWaiterId
              existing.assignedWaiterName = dto.order.assignedWaiterName
            }
          })
        )
      } else if (role === UserRole.Waiter) {
        if (dto.order.assignedWaiterId === userId) {
          dispatch(
            ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
              if (!draft.find((o) => o.id === dto.order.id)) {
                draft.push(dto.order)
              }
            })
          )
        } else {
          dispatch(
            ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
              const idx = draft.findIndex((o) => o.id === dto.order.id)
              if (idx !== -1) draft.splice(idx, 1)
            })
          )
        }
      }
    }

    conn.on('OrderPlaced', handleOrderPlaced)
    conn.on('WaiterAssigned', handleWaiterAssigned)

    return () => {
      conn.off('OrderPlaced', handleOrderPlaced)
      conn.off('WaiterAssigned', handleWaiterAssigned)
    }
  }, [dispatch, userId, role])
}
