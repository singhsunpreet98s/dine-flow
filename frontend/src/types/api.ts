import type { OrderChannel, OrderStatus, PaymentMode, TableStatus, UserRole } from './enums'

export interface AuthResponse {
  token: string
  userId: string
  name: string
  role: UserRole
  isSetupComplete: boolean
  timeZoneId: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface CreateSubUserRequest {
  name: string
  email: string
  password: string
  role: UserRole
}

export interface OrderItemDto {
  id: string
  menuItemId: string
  menuItemName: string
  unitPrice: number
  quantity: number
  customizationNote: string | null
}

export interface CreateOrderItemRequest {
  menuItemId: string
  quantity: number
  customizationNote?: string
}

export interface CreateOrderRequest {
  customerName?: string
  channel: OrderChannel
  memberCount: number
  tableId?: string
  items: CreateOrderItemRequest[]
}

export interface AddItemsRequest {
  items: CreateOrderItemRequest[]
}

export interface OrderDto {
  id: string
  orderNumber: string
  status: OrderStatus
  channel: OrderChannel
  tableId: string | null
  customerName: string | null
  notes: string | null
  memberCount: number
  totalAmount: number
  paymentMode: PaymentMode | null
  createdAt: string
  updatedAt: string
  items: OrderItemDto[]
  assignedWaiterId: string | null
  assignedWaiterName: string | null
}

export interface MenuItemDto {
  id: string
  name: string
  description: string | null
  categoryId: string
  categoryName: string
  price: number
  isAvailable: boolean
  photoUrl: string | null
  displayOrder: number
}

export interface MenuCategoryDto {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  itemCount: number
  items: MenuItemDto[]
}

export interface TableDto {
  id: string
  number: string
  capacity: number
  status: TableStatus
  floorSection: string | null
}

export interface AppUserDto {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
}

export interface AuditLogDto {
  id: string
  entityId: string
  entityType: string
  action: string
  fromStatus: OrderStatus | null
  toStatus: OrderStatus | null
  paymentMode: PaymentMode | null
  performedBy: string
  timestamp: string
}

// SignalR event payloads
export interface OrderStatusChangedDto {
  orderId: string
  newStatus: OrderStatus
  previousStatus: OrderStatus
  performedBy: string
  timestamp: string
}

export interface OrderPlacedDto {
  order: OrderDto
}

export interface ItemOutOfStockDto {
  orderId: string
  itemName: string
  tableId: string | null
}

export interface RestaurantTableDto {
  id: string
  floorId: string
  tableNumber: string
  capacity: number
  shape: string // "Square" | "Round" | "Rectangle"
  positionX: number
  positionY: number
  width: number
  height: number
  status: string // "Available" | "Occupied" | "Reserved" | "Inactive"
}

export interface FloorDto {
  id: string
  name: string
  displayOrder: number
  tables: RestaurantTableDto[]
}

export interface SaveLayoutTableItem {
  id: string
  positionX: number
  positionY: number
  width: number
  height: number
}

export interface SaveLayoutRequest {
  floorId: string
  tables: SaveLayoutTableItem[]
}

export interface CreateFloorPayload {
  name: string
  displayOrder: number
}

export interface UpdateFloorPayload {
  name: string
  displayOrder: number
}

export interface CreateTablePayload {
  floorId: string
  tableNumber: string
  capacity: number
  shape: string
  positionX: number
  positionY: number
  width: number
  height: number
}

export interface UpdateTablePayload {
  tableNumber: string
  capacity: number
  shape: string
  positionX: number
  positionY: number
  width: number
  height: number
  status: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface CreateMenuCategoryRequest {
  name: string
  sortOrder: number
  isActive: boolean
}

export interface UpdateMenuCategoryRequest {
  name: string
  sortOrder: number
  isActive: boolean
}

export interface MenuItemQueryParams {
  categoryId?: string
  search?: string
  page: number
  pageSize: number
}

export interface AssignWaiterRequest {
  waiterId: string
}

export interface WaiterAssignedDto {
  order: OrderDto
}

export interface OrderItemLiveDto {
  menuItemName: string
  quantity: number
  customizationNote?: string
}

export interface ActiveOrderSummaryDto {
  orderId: string
  orderNumber: string
  status: string
  memberCount: number
  totalAmount: number
  placedAt: string // UTC ISO string
  items: OrderItemLiveDto[]
  assignedWaiterName?: string
  customerName?: string
}

export interface TableLiveDto {
  id: string
  tableNumber: string
  capacity: number
  shape: string
  positionX: number
  positionY: number
  width: number
  height: number
  status: string
  activeOrder?: ActiveOrderSummaryDto
}

export interface FloorLiveDto {
  id: string
  name: string
  displayOrder: number
  tables: TableLiveDto[]
}

// SignalR event payload
export interface TableStatusChangedDto {
  tableId: string
  status: string
  orderId: string | null
}
