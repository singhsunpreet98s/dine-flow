import { useEffect } from 'react'
import { getSignalRConnection, startSignalRConnection } from '@/app/signalr'
import { useAppDispatch } from '@/app/hooks'
import { ordersApi } from '@/features/orders/ordersApi'
import { setAccentColor, type AccentColor } from '@/features/ui/uiSlice'
import type { OrderStatusChangedDto, OrderPlacedDto } from '@/types/api'

export function useSignalR() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const connection = getSignalRConnection()
    startSignalRConnection().catch(console.error)

    const handleStatusChanged = (dto: OrderStatusChangedDto) => {
      dispatch(
        ordersApi.util.updateQueryData('getOrder', dto.orderId, (draft) => {
          draft.status = dto.newStatus
        })
      )
      dispatch(
        ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
          const order = draft.find((o) => o.id === dto.orderId)
          if (order) order.status = dto.newStatus
        })
      )
    }

    const handleOrderPlaced = (dto: OrderPlacedDto) => {
      dispatch(
        ordersApi.util.updateQueryData('getOrders', undefined, (draft) => {
          draft.push(dto.order)
        })
      )
    }

    const handleSettingsUpdated = (payload: { themeAccentColor: string }) => {
      dispatch(setAccentColor(payload.themeAccentColor as AccentColor))
    }

    connection.on('OrderStatusChanged', handleStatusChanged)
    connection.on('OrderPlaced', handleOrderPlaced)
    connection.on('SettingsUpdated', handleSettingsUpdated)

    return () => {
      connection.off('OrderStatusChanged', handleStatusChanged)
      connection.off('OrderPlaced', handleOrderPlaced)
      connection.off('SettingsUpdated', handleSettingsUpdated)
    }
  }, [dispatch])
}
