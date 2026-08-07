import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { DailyOrdersChart } from '@/features/dashboard/components/DailyOrdersChart'
import type { DailyOrderPoint } from '@/features/dashboard/dashboardTypes'

// Recharts uses SVG + ResizeObserver which JSDOM does not support.
// Replace with lightweight stubs that render testable DOM nodes.
jest.mock('recharts', () => {
  const React = require('react') // eslint-disable-line @typescript-eslint/no-require-imports
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    BarChart: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'bar-chart' }, children),
    Bar: () => React.createElement('div', { 'data-testid': 'bar' }),
    XAxis: () => React.createElement('div', { 'data-testid': 'x-axis' }),
    YAxis: () => React.createElement('div', { 'data-testid': 'y-axis' }),
    CartesianGrid: () => React.createElement('div', { 'data-testid': 'cartesian-grid' }),
    Tooltip: () => React.createElement('div', { 'data-testid': 'tooltip' }),
  }
})

const sampleData: DailyOrderPoint[] = [
  { date: 'Jan 1', orders: 10 },
  { date: 'Jan 2', orders: 5 },
  { date: 'Jan 3', orders: 0 },
]

describe('DailyOrdersChart', () => {
  it('renders the chart wrapper', () => {
    render(<DailyOrdersChart data={sampleData} />)
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
  })

  it('renders the bar chart', () => {
    render(<DailyOrdersChart data={sampleData} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders without crashing when data is empty', () => {
    render(<DailyOrdersChart data={[]} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders a single bar element', () => {
    render(<DailyOrdersChart data={sampleData} />)
    expect(screen.getByTestId('bar')).toBeInTheDocument()
  })
})
