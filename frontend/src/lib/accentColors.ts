import type { AccentColor } from '@/features/ui/uiSlice'

interface ColorTokens {
  primary: string
  primaryFg: string
  ring: string
}

export interface AccentDef {
  id: AccentColor
  label: string
  swatch: string
  light: ColorTokens
  dark: ColorTokens
}

export const ACCENT_COLORS: AccentDef[] = [
  {
    id: 'blue',
    label: 'Blue',
    swatch: 'bg-blue-500',
    light: { primary: '221.2 83.2% 53.3%', primaryFg: '210 40% 98%', ring: '221.2 83.2% 53.3%' },
    dark: { primary: '217.2 91.2% 59.8%', primaryFg: '222.2 47.4% 11.2%', ring: '224.3 76.3% 48%' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    swatch: 'bg-indigo-500',
    light: { primary: '239 84% 67%', primaryFg: '210 40% 98%', ring: '239 84% 67%' },
    dark: { primary: '238.7 92% 70%', primaryFg: '222.2 47.4% 11.2%', ring: '238.7 92% 70%' },
  },
  {
    id: 'violet',
    label: 'Violet',
    swatch: 'bg-violet-500',
    light: { primary: '262.1 83.3% 57.8%', primaryFg: '210 40% 98%', ring: '262.1 83.3% 57.8%' },
    dark: { primary: '263.4 70% 50.4%', primaryFg: '210 40% 98%', ring: '263.4 70% 50.4%' },
  },
  {
    id: 'rose',
    label: 'Rose',
    swatch: 'bg-rose-500',
    light: { primary: '346.8 77.2% 49.8%', primaryFg: '210 40% 98%', ring: '346.8 77.2% 49.8%' },
    dark: { primary: '347.8 86.7% 60%', primaryFg: '222.2 47.4% 11.2%', ring: '347.8 86.7% 60%' },
  },
  {
    id: 'orange',
    label: 'Orange',
    swatch: 'bg-orange-500',
    light: { primary: '24.6 95% 53.1%', primaryFg: '210 40% 98%', ring: '24.6 95% 53.1%' },
    dark: { primary: '20.5 90.2% 48.2%', primaryFg: '210 40% 98%', ring: '20.5 90.2% 48.2%' },
  },
  {
    id: 'amber',
    label: 'Amber',
    swatch: 'bg-amber-500',
    light: { primary: '37.7 92.1% 50.2%', primaryFg: '26 83.3% 14.1%', ring: '37.7 92.1% 50.2%' },
    dark: { primary: '45.4 93.4% 47.5%', primaryFg: '26 83.3% 14.1%', ring: '45.4 93.4% 47.5%' },
  },
  {
    id: 'green',
    label: 'Green',
    swatch: 'bg-green-500',
    light: { primary: '142.1 76.2% 36.3%', primaryFg: '210 40% 98%', ring: '142.1 76.2% 36.3%' },
    dark: { primary: '142.1 70.6% 45.3%', primaryFg: '222.2 47.4% 11.2%', ring: '142.1 70.6% 45.3%' },
  },
  {
    id: 'teal',
    label: 'Teal',
    swatch: 'bg-teal-500',
    light: { primary: '172.5 66% 50.4%', primaryFg: '210 40% 98%', ring: '172.5 66% 50.4%' },
    dark: { primary: '172.5 66% 50.4%', primaryFg: '222.2 47.4% 11.2%', ring: '172.5 66% 50.4%' },
  },
  {
    id: 'cyan',
    label: 'Cyan',
    swatch: 'bg-cyan-500',
    light: { primary: '188.7 94.5% 42.7%', primaryFg: '210 40% 98%', ring: '188.7 94.5% 42.7%' },
    dark: { primary: '186.8 93.5% 81.8%', primaryFg: '222.2 47.4% 11.2%', ring: '186.8 93.5% 81.8%' },
  },
  {
    id: 'slate',
    label: 'Slate',
    swatch: 'bg-slate-500',
    light: { primary: '215.4 16.3% 46.9%', primaryFg: '210 40% 98%', ring: '215.4 16.3% 46.9%' },
    dark: { primary: '215.3 19.3% 34.5%', primaryFg: '210 40% 98%', ring: '215.3 19.3% 34.5%' },
  },
  {
    id: 'pink',
    label: 'Pink',
    swatch: 'bg-pink-500',
    light: { primary: '322.1 73.3% 52%', primaryFg: '210 40% 98%', ring: '322.1 73.3% 52%' },
    dark: { primary: '323.7 77.6% 56%', primaryFg: '222.2 47.4% 11.2%', ring: '323.7 77.6% 56%' },
  },
  {
    id: 'red',
    label: 'Red',
    swatch: 'bg-red-500',
    light: { primary: '0 84.2% 60.2%', primaryFg: '210 40% 98%', ring: '0 84.2% 60.2%' },
    dark: { primary: '0 72.2% 50.6%', primaryFg: '210 40% 98%', ring: '0 72.2% 50.6%' },
  },
]
