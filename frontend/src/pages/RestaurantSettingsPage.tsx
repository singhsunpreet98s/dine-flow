import { useEffect, useRef, useState } from 'react'
import { Moon, Sun, Check } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/app/hooks'
import { setAccentColor, setTheme, type AccentColor } from '@/features/ui/uiSlice'
import { setCredentials } from '@/features/auth/authSlice'
import { useUpdateTimezoneMutation } from '@/features/auth/authApi'
import { ACCENT_COLORS, type AccentDef } from '@/lib/accentColors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useGetSettingsQuery, useUpdateSettingsMutation, useUploadLogoMutation } from '@/features/settings/settingsApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type SaveStatus = 'idle' | 'success' | 'error'

const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: 'UTC',                 label: 'UTC' },
  { value: 'Asia/Kolkata',        label: 'India (IST, UTC+5:30)' },
  { value: 'Asia/Dubai',          label: 'Gulf (GST, UTC+4)' },
  { value: 'Asia/Singapore',      label: 'Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo',          label: 'Japan (JST, UTC+9)' },
  { value: 'Asia/Shanghai',       label: 'China (CST, UTC+8)' },
  { value: 'Europe/London',       label: 'London (GMT/BST)' },
  { value: 'Europe/Paris',        label: 'Central Europe (CET, UTC+1)' },
  { value: 'America/New_York',    label: 'US Eastern (EST/EDT)' },
  { value: 'America/Chicago',     label: 'US Central (CST/CDT)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)' },
  { value: 'Australia/Sydney',    label: 'Sydney (AEDT, UTC+11)' },
  { value: 'Pacific/Auckland',    label: 'New Zealand (NZST, UTC+12)' },
]

// ---------------------------------------------------------------------------
// Mini dashboard card — each color option is a clickable UI preview
// ---------------------------------------------------------------------------

interface ColorCardProps {
  color: AccentDef
  isDark: boolean
  isSelected: boolean
  onClick: () => void
}

function ColorCard({ color, isDark, isSelected, onClick }: ColorCardProps) {
  const tokens  = isDark ? color.dark  : color.light
  const primary   = `hsl(${tokens.primary})`
  const primaryFg = `hsl(${tokens.primaryFg})`

  const bg     = isDark ? '#18181b' : '#f4f4f5'
  const card   = isDark ? '#27272a' : '#ffffff'
  const border = isDark ? '#3f3f46' : '#e4e4e7'
  const muted  = isDark ? '#52525b' : '#d4d4d8'
  const stripe = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col items-center gap-1.5 focus:outline-none',
      )}
      aria-label={color.label}
      aria-pressed={isSelected}
    >
      {/* Dashboard thumbnail */}
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-xl border transition-all duration-150 ring-offset-background',
          'group-hover:scale-[1.03] group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
          isSelected
            ? 'scale-[1.03] ring-2 ring-ring ring-offset-2'
            : 'opacity-80 group-hover:opacity-100',
        )}
        style={{ backgroundColor: bg, borderColor: border, height: 100 }}
      >

        {/* Sidebar — colored strip with logo + nav stubs */}
        <div
          className="absolute left-0 top-0 h-full w-8 flex flex-col items-center py-1.5 gap-1"
          style={{ backgroundColor: card, borderRight: `1px solid ${border}` }}
        >
          {/* Logo */}
          <div
            className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
            style={{ backgroundColor: primary }}
          >
            <div className="w-1.5 h-0.5 rounded-full" style={{ backgroundColor: primaryFg, opacity: 0.9 }} />
          </div>
          {/* Active nav */}
          <div className="relative w-5 h-1 rounded-sm shrink-0" style={{ backgroundColor: primary, opacity: 0.2 }}>
            <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-r-full" style={{ backgroundColor: primary }} />
          </div>
          {/* Inactive navs */}
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-5 h-1 rounded-sm shrink-0" style={{ backgroundColor: muted, opacity: 0.4 }} />
          ))}
        </div>

        {/* Main area */}
        <div className="absolute left-8 top-0 right-0 bottom-0 flex flex-col">

          {/* Topbar */}
          <div
            className="h-6 shrink-0 flex items-center px-1.5 gap-1"
            style={{ backgroundColor: card, borderBottom: `1px solid ${border}` }}
          >
            <div className="h-1 w-8 rounded-sm" style={{ backgroundColor: muted, opacity: 0.5 }} />
            <div className="ml-auto h-3.5 w-9 rounded flex items-center justify-center"
                 style={{ backgroundColor: primary }}>
              <div className="h-0.5 w-5 rounded-sm" style={{ backgroundColor: primaryFg, opacity: 0.85 }} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-1.5 flex flex-col gap-1">

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-1 shrink-0">
              {[true, false, false].map((accent, i) => (
                <div key={i} className="rounded p-1 flex flex-col gap-0.5"
                     style={{ backgroundColor: card, border: `1px solid ${border}` }}>
                  <div className="h-0.5 w-3 rounded-full"
                       style={{ backgroundColor: accent ? primary : muted, opacity: accent ? 1 : 0.4 }} />
                  <div className="h-1.5 w-4 rounded-sm" style={{ backgroundColor: muted, opacity: 0.3 }} />
                </div>
              ))}
            </div>

            {/* Table rows */}
            <div className="flex-1 rounded overflow-hidden"
                 style={{ backgroundColor: card, border: `1px solid ${border}` }}>
              {[
                { dot: primary },
                { dot: muted   },
                { dot: muted   },
              ].map((row, i) => (
                <div key={i} className="flex items-center px-1 gap-1 border-b last:border-b-0"
                     style={{ height: 11, borderColor: border, backgroundColor: i % 2 === 1 ? stripe : 'transparent' }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: row.dot }} />
                  {[8, 12, 6].map((w, j) => (
                    <div key={j} className="h-0.5 rounded-full shrink-0"
                         style={{ width: w * 2, backgroundColor: j === 0 && i === 0 ? primary : muted, opacity: 0.5 }} />
                  ))}
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Selected checkmark badge */}
        {isSelected && (
          <div
            className="absolute bottom-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
            style={{ backgroundColor: primary }}
          >
            <Check className="h-3 w-3" style={{ color: primaryFg }} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* Color label */}
      <span
        className={cn(
          'text-[11px] leading-none font-medium transition-colors',
          isSelected ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {color.label}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function RestaurantSettingsPage() {
  const dispatch = useAppDispatch()
  const { accentColor, theme } = useAppSelector((s) => s.ui)
  const currentTimeZoneId = useAppSelector((s) => s.auth.timeZoneId)

  const { data, isLoading } = useGetSettingsQuery()
  const [updateName,     { isLoading: isSavingName     }] = useUpdateSettingsMutation()
  const [updateColor,    { isLoading: isSavingColor    }] = useUpdateSettingsMutation()
  const [updateTimezone, { isLoading: isSavingTimezone }] = useUpdateTimezoneMutation()
  const [uploadLogo,     { isLoading: isUploadingLogo  }] = useUploadLogoMutation()

  const [localName,           setLocalName]           = useState('')
  const [nameSaveStatus,      setNameSaveStatus]      = useState<SaveStatus>('idle')
  const [localTimeZoneId,     setLocalTimeZoneId]     = useState(currentTimeZoneId)
  const [timezoneSaveStatus,  setTimezoneSaveStatus]  = useState<SaveStatus>('idle')
  const [logoUploadStatus,    setLogoUploadStatus]    = useState<SaveStatus>('idle')

  const logoFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (data) {
      dispatch(setAccentColor(data.themeAccentColor as AccentColor))
      setLocalName(data.name)
    }
  }, [data, dispatch])

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploadStatus('idle')
    const formData = new FormData()
    formData.append('logo', file)
    try {
      await uploadLogo(formData).unwrap()
      setLogoUploadStatus('success')
    } catch {
      setLogoUploadStatus('error')
    }
    // Reset so the same file can be re-uploaded if needed
    if (logoFileInputRef.current) logoFileInputRef.current.value = ''
  }

  async function handleSaveName() {
    setNameSaveStatus('idle')
    try {
      await updateName({ name: localName }).unwrap()
      setNameSaveStatus('success')
    } catch {
      setNameSaveStatus('error')
    }
  }

  async function handleAccentColorChange(colorId: AccentColor) {
    dispatch(setAccentColor(colorId))
    try {
      await updateColor({ themeAccentColor: colorId }).unwrap()
    } catch {
      // Server value re-applied on next invalidation
    }
  }

  async function handleSaveTimezone() {
    setTimezoneSaveStatus('idle')
    try {
      const response = await updateTimezone({ timeZoneId: localTimeZoneId }).unwrap()
      dispatch(setCredentials({ token: response.token, timeZoneId: response.timeZoneId }))
      setTimezoneSaveStatus('success')
    } catch {
      setTimezoneSaveStatus('error')
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Restaurant Settings</h1>

      {/* ── Restaurant Logo ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Restaurant Logo
        </h2>
        <div className="flex flex-col gap-3">
          {data?.logoUrl ? (
            <img
              src={data.logoUrl}
              alt="Restaurant logo"
              className="h-24 w-auto max-w-xs rounded border border-border object-contain"
            />
          ) : (
            <button
              type="button"
              className="flex h-24 w-48 cursor-pointer items-center justify-center rounded border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              onClick={() => logoFileInputRef.current?.click()}
            >
              <span className="text-xs">Click to upload logo</span>
            </button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLogoUploadStatus('idle'); logoFileInputRef.current?.click() }}
              disabled={isUploadingLogo}
            >
              {isUploadingLogo ? 'Uploading…' : data?.logoUrl ? 'Change Logo' : 'Upload Logo'}
            </Button>
            <input
              ref={logoFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          {logoUploadStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">Logo uploaded successfully.</p>
          )}
          {logoUploadStatus === 'error' && (
            <p className="text-sm text-destructive">Failed to upload logo. Please try again.</p>
          )}
        </div>
      </section>

      {/* ── Restaurant Name ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Restaurant Name
        </h2>
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="restaurant-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="restaurant-name"
              value={localName}
              onChange={(e) => { setLocalName(e.target.value); setNameSaveStatus('idle') }}
              placeholder="Enter restaurant name"
            />
            <Button onClick={handleSaveName} disabled={isSavingName}>
              {isSavingName ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {nameSaveStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">Name saved successfully.</p>
          )}
          {nameSaveStatus === 'error' && (
            <p className="text-sm text-destructive">Failed to save. Please try again.</p>
          )}
        </div>
      </section>

      {/* ── Appearance ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Appearance
        </h2>
        <div className="flex gap-3">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => dispatch(setTheme('light'))}
            className="flex items-center gap-2"
          >
            <Sun className="h-4 w-4" /> Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => dispatch(setTheme('dark'))}
            className="flex items-center gap-2"
          >
            <Moon className="h-4 w-4" /> Dark
          </Button>
        </div>
      </section>

      {/* ── Your Timezone ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Timezone
        </h2>
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="timezone-select">Timezone</Label>
          <div className="flex gap-2">
            <Select
              value={localTimeZoneId}
              onValueChange={(value) => { setLocalTimeZoneId(value); setTimezoneSaveStatus('idle') }}
            >
              <SelectTrigger id="timezone-select" className="flex-1">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleSaveTimezone} disabled={isSavingTimezone}>
              {isSavingTimezone ? 'Saving…' : 'Save'}
            </Button>
          </div>
          {timezoneSaveStatus === 'success' && (
            <p className="text-sm text-green-600 dark:text-green-400">Timezone saved successfully.</p>
          )}
          {timezoneSaveStatus === 'error' && (
            <p className="text-sm text-destructive">Failed to save. Please try again.</p>
          )}
        </div>
      </section>

      {/* ── Accent Color ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Accent Color
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Applies to all users in real time
            </p>
          </div>
          {isSavingColor && (
            <span className="animate-pulse text-xs text-muted-foreground">Saving…</span>
          )}
        </div>

        {/* 12 mini dashboard cards — 2 cols mobile, 3 sm, 4 lg */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ACCENT_COLORS.map((color) => (
            <ColorCard
              key={color.id}
              color={color}
              isDark={theme === 'dark'}
              isSelected={accentColor === color.id}
              onClick={() => handleAccentColorChange(color.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
