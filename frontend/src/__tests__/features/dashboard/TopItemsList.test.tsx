import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TopItemsList } from '@/features/dashboard/components/TopItemsList'
import type { TopItem } from '@/features/dashboard/dashboardTypes'

const sampleItems: TopItem[] = [
  { name: 'Burger', count: 20 },
  { name: 'Pizza', count: 15 },
  { name: 'Pasta', count: 10 },
]

describe('TopItemsList', () => {
  it('renders all item names', () => {
    render(<TopItemsList items={sampleItems} />)
    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.getByText('Pizza')).toBeInTheDocument()
    expect(screen.getByText('Pasta')).toBeInTheDocument()
  })

  it('renders item counts', () => {
    render(<TopItemsList items={sampleItems} />)
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders rank numbers starting from 1', () => {
    render(<TopItemsList items={sampleItems} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('renders each item as a list item', () => {
    render(<TopItemsList items={sampleItems} />)
    const listItems = screen.getAllByRole('listitem')
    expect(listItems).toHaveLength(3)
  })

  it('renders empty list without crashing', () => {
    render(<TopItemsList items={[]} />)
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('renders a single item correctly', () => {
    render(<TopItemsList items={[{ name: 'Burger', count: 5 }]} />)
    expect(screen.getByText('Burger')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders items in the order they are provided', () => {
    render(<TopItemsList items={sampleItems} />)
    const names = screen.getAllByRole('listitem').map((li) => li.textContent)
    // Each listitem contains its rank, name and count — just check order
    expect(names[0]).toContain('Burger')
    expect(names[1]).toContain('Pizza')
    expect(names[2]).toContain('Pasta')
  })
})
