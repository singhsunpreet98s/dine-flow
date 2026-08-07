export interface DailyOrderPoint { date: string; orders: number }
export interface IncomeByModePoint { mode: string; amount: number }
export interface ChannelPoint { channel: string; count: number }
export interface TopItem { name: string; count: number }

export interface DashboardStatsDto {
  totalOrders: number
  todayOrders: number
  pendingOrders: number
  delayedOrders: number
  dailyAverage: number
  todayIncome: number
  tablesOccupied: number
  totalTables: number
  cancelledOrders: number
  dailyOrders: DailyOrderPoint[]
  incomeByMode: IncomeByModePoint[]
  ordersByChannel: ChannelPoint[]
  topItems: TopItem[]
}
