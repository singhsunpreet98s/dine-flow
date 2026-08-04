export enum OrderStatus {
  Placed = 'Placed',
  SentToKitchen = 'SentToKitchen',
  Preparing = 'Preparing',
  OutOfStock = 'OutOfStock',
  Prepared = 'Prepared',
  Served = 'Served',
  Billed = 'Billed',
  Paid = 'Paid',
  Closed = 'Closed',
}

export enum OrderChannel {
  DineIn = 'DineIn',
  Takeaway = 'Takeaway',
  Zomato = 'Zomato',
  Swiggy = 'Swiggy',
  Other = 'Other',
}

export enum TableStatus {
  Available = 'Available',
  Occupied = 'Occupied',
  Reserved = 'Reserved',
  Cleaning = 'Cleaning',
  Inactive = 'Inactive',
}

export enum TableShape {
  Square = 'Square',
  Round = 'Round',
  Rectangle = 'Rectangle',
}

export enum PaymentMode {
  Cash = 'Cash',
  Card = 'Card',
  UPI = 'UPI',
  Other = 'Other',
}

export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Waiter = 'Waiter',
  Kitchen = 'Kitchen',
}

export const CHANNEL_BADGE: Record<OrderChannel, string> = {
  [OrderChannel.DineIn]:   'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  [OrderChannel.Takeaway]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  [OrderChannel.Zomato]:   'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  [OrderChannel.Swiggy]:   'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  [OrderChannel.Other]:    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

export const TABLE_STATUS_COLOR: Record<TableStatus, string> = {
  [TableStatus.Available]: 'border-green-500 bg-green-50 dark:bg-green-950/30',
  [TableStatus.Occupied]:  'border-red-500 bg-red-50 dark:bg-red-950/30',
  [TableStatus.Reserved]:  'border-amber-500 bg-amber-50 dark:bg-amber-950/30',
  [TableStatus.Cleaning]:  'border-blue-400 bg-blue-50 dark:bg-blue-950/30',
  [TableStatus.Inactive]:  'border-gray-300 bg-gray-100 dark:bg-gray-800/50',
}

export const TABLE_STATUS_RING: Record<TableStatus, string> = {
  [TableStatus.Available]: 'ring-green-500',
  [TableStatus.Occupied]:  'ring-red-500',
  [TableStatus.Reserved]:  'ring-amber-500',
  [TableStatus.Cleaning]:  'ring-blue-400',
  [TableStatus.Inactive]:  'ring-gray-400',
}

export const TABLE_STATUS_CLASSES: Record<string, string> = {
  Available: 'bg-gray-100 border-2 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400',
  Occupied:  'bg-primary border-2 border-primary/80 text-primary-foreground',
  Reserved:  'bg-amber-100 border-2 border-amber-400 text-amber-800 dark:bg-amber-900 dark:border-amber-600 dark:text-amber-200',
  Cleaning:  'bg-blue-100 border-2 border-blue-400 text-blue-800 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200',
  Inactive:  'bg-gray-50 border-2 border-gray-200 text-gray-300 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-600',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.Placed]:        'Placed',
  [OrderStatus.SentToKitchen]: 'Sent to Kitchen',
  [OrderStatus.Preparing]:     'Preparing',
  [OrderStatus.OutOfStock]:    'Out of Stock',
  [OrderStatus.Prepared]:      'Prepared',
  [OrderStatus.Served]:        'Served',
  [OrderStatus.Billed]:        'Billed',
  [OrderStatus.Paid]:          'Paid',
  [OrderStatus.Closed]:        'Closed',
}
