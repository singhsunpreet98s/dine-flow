import { useState, useRef, useEffect } from 'react'
import type { MenuItemDto } from '@/types/api'
import { useGetMenuItemsQuery } from '@/features/menu/menuApi'

interface MenuItemSearchProps {
  onSelect: (item: MenuItemDto) => void
}

export function MenuItemSearch({ onSelect }: MenuItemSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useGetMenuItemsQuery(
    { search: query, page: 1, pageSize: 20 },
    { skip: query.trim().length < 1 },
  )

  const items = data?.items ?? []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item: MenuItemDto) {
    onSelect(item)
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => query.length >= 1 && setOpen(true)}
        placeholder="Search menu items..."
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {open && query.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-60 overflow-y-auto">
          {isFetching && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p>
          )}
          {!isFetching && items.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">No items found.</p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => handleSelect(item)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span>{item.name}</span>
              <span className="text-muted-foreground">&#8377;{item.price.toFixed(2)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
