import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestaurantSettingsPage } from '@/pages/RestaurantSettingsPage'
import { useAppSelector, useAppDispatch } from '@/app/hooks'
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
  useUploadLogoMutation,
} from '@/features/settings/settingsApi'
import { useUpdateTimezoneMutation } from '@/features/auth/authApi'

// ── module mocks ──────────────────────────────────────────────────────────────

jest.mock('@/app/hooks', () => ({
  useAppSelector: jest.fn(),
  useAppDispatch: jest.fn(() => jest.fn()),
}))

jest.mock('@/features/settings/settingsApi', () => ({
  useGetSettingsQuery: jest.fn(),
  useUpdateSettingsMutation: jest.fn(),
  useUploadLogoMutation: jest.fn(),
  settingsApi: { endpoints: {} },
}))

jest.mock('@/features/auth/authApi', () => ({
  useUpdateTimezoneMutation: jest.fn(),
}))

// Limit ACCENT_COLORS to two entries so tests run fast and assertions are tight.
jest.mock('@/lib/accentColors', () => ({
  ACCENT_COLORS: [
    {
      id: 'blue',
      label: 'Blue',
      swatch: 'bg-blue-500',
      light: { primary: '221 83% 53%', primaryFg: '0 0% 100%', ring: '221 83% 53%' },
      dark:  { primary: '217 91% 60%', primaryFg: '0 0% 100%', ring: '217 91% 60%' },
    },
    {
      id: 'rose',
      label: 'Rose',
      swatch: 'bg-rose-500',
      light: { primary: '346 77% 50%', primaryFg: '0 0% 100%', ring: '346 77% 50%' },
      dark:  { primary: '346 77% 60%', primaryFg: '0 0% 100%', ring: '346 77% 60%' },
    },
  ],
}))

// ── fixtures ──────────────────────────────────────────────────────────────────

const defaultSettings = {
  name: 'Spice Garden',
  themeAccentColor: 'blue',
  logoUrl: null as string | null,
  gstRate: 5,
}

// ── mock state shape passed to useAppSelector selectors ───────────────────────

const mockStoreState = {
  ui:   { theme: 'light', accentColor: 'blue' },
  auth: { timeZoneId: 'UTC' },
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a mutation fn mock: calling it returns an object with .unwrap() */
function makeMutationFn<T>(resolvedValue: T) {
  return jest.fn().mockReturnValue({ unwrap: jest.fn().mockResolvedValue(resolvedValue) })
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()

  ;(useAppSelector as jest.Mock).mockImplementation(
    (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
  )

  ;(useGetSettingsQuery as jest.Mock).mockReturnValue({
    data: defaultSettings,
    isLoading: false,
  })

  ;(useUpdateSettingsMutation as jest.Mock).mockReturnValue([
    makeMutationFn(defaultSettings),
    { isLoading: false },
  ])

  ;(useUploadLogoMutation as jest.Mock).mockReturnValue([
    makeMutationFn({ logoUrl: 'https://cdn.example.com/logo.png' }),
    { isLoading: false },
  ])

  ;(useUpdateTimezoneMutation as jest.Mock).mockReturnValue([
    makeMutationFn({ token: 'tok', timeZoneId: 'UTC' }),
    { isLoading: false },
  ])
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('RestaurantSettingsPage', () => {
  // ── Rendering ───────────────────────────────────────────────────────────────

  it('renders the page heading', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByRole('heading', { name: /restaurant settings/i })).toBeInTheDocument()
  })

  it('renders Restaurant Name section', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByText('Restaurant Name')).toBeInTheDocument()
  })

  it('renders Appearance section', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByText('Appearance')).toBeInTheDocument()
  })

  it('renders Accent Color section', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByText('Accent Color')).toBeInTheDocument()
  })

  it('renders Your Timezone section', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByText('Your Timezone')).toBeInTheDocument()
  })

  it('renders the restaurant name input populated from settings', () => {
    render(<RestaurantSettingsPage />)
    // The useEffect sets localName from data.name; act() in render flushes it.
    expect(screen.getByPlaceholderText(/enter restaurant name/i)).toHaveValue('Spice Garden')
  })

  it('renders upload logo button when no logo is set', () => {
    render(<RestaurantSettingsPage />)
    // The Shadcn Button reads "Upload Logo" (exact); the dashed placeholder reads
    // "Click to upload logo" — use exact match to target only the action button.
    expect(screen.getByRole('button', { name: 'Upload Logo' })).toBeInTheDocument()
  })

  it('renders restaurant logo img when logoUrl is set', () => {
    ;(useGetSettingsQuery as jest.Mock).mockReturnValue({
      data: { ...defaultSettings, logoUrl: 'https://cdn.example.com/logo.png' },
      isLoading: false,
    })
    render(<RestaurantSettingsPage />)
    expect(screen.getByRole('img', { name: /restaurant logo/i })).toBeInTheDocument()
  })

  it('shows LoadingSpinner and hides page content when data is loading', () => {
    ;(useGetSettingsQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    render(<RestaurantSettingsPage />)
    // When isLoading the component returns <LoadingSpinner /> — no main heading
    expect(
      screen.queryByRole('heading', { name: /restaurant settings/i }),
    ).not.toBeInTheDocument()
  })

  // ── Interactions ─────────────────────────────────────────────────────────────

  it('Light button dispatches setTheme light when clicked', async () => {
    const mockDispatch = jest.fn()
    ;(useAppDispatch as jest.Mock).mockReturnValue(mockDispatch)

    const user = userEvent.setup()
    render(<RestaurantSettingsPage />)

    await user.click(screen.getByRole('button', { name: /light/i }))

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ui/setTheme', payload: 'light' }),
    )
  })

  it('Dark button dispatches setTheme dark when clicked', async () => {
    const mockDispatch = jest.fn()
    ;(useAppDispatch as jest.Mock).mockReturnValue(mockDispatch)

    const user = userEvent.setup()
    render(<RestaurantSettingsPage />)

    await user.click(screen.getByRole('button', { name: /dark/i }))

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'ui/setTheme', payload: 'dark' }),
    )
  })

  it('Save button calls updateSettings with the current name', async () => {
    const mockSaveFn = makeMutationFn(defaultSettings)
    ;(useUpdateSettingsMutation as jest.Mock).mockReturnValue([mockSaveFn, { isLoading: false }])

    const user = userEvent.setup()
    render(<RestaurantSettingsPage />)

    const input = screen.getByPlaceholderText(/enter restaurant name/i)
    await user.clear(input)
    await user.type(input, 'New Name')

    // First "Save" button belongs to the Restaurant Name section
    const saveButtons = screen.getAllByRole('button', { name: 'Save' })
    await user.click(saveButtons[0])

    expect(mockSaveFn).toHaveBeenCalledWith({ name: 'New Name' })
  })

  // ── Status messages ───────────────────────────────────────────────────────────

  it('shows success message after successful name save', async () => {
    const mockSaveFn = makeMutationFn(defaultSettings)
    ;(useUpdateSettingsMutation as jest.Mock).mockReturnValue([mockSaveFn, { isLoading: false }])

    const user = userEvent.setup()
    render(<RestaurantSettingsPage />)

    const saveButtons = screen.getAllByRole('button', { name: 'Save' })
    await user.click(saveButtons[0])

    // setNameSaveStatus('success') is called after unwrap resolves
    expect(await screen.findByText(/name saved successfully/i)).toBeInTheDocument()
  })

  // ── Color cards ───────────────────────────────────────────────────────────────

  it('renders all accent color cards from ACCENT_COLORS', () => {
    render(<RestaurantSettingsPage />)
    expect(screen.getByText('Blue')).toBeInTheDocument()
    expect(screen.getByText('Rose')).toBeInTheDocument()
  })

  it('Blue color card has aria-pressed true when accentColor is blue', () => {
    render(<RestaurantSettingsPage />)
    // ColorCard renders a <button aria-label={color.label} aria-pressed={isSelected}>
    const blueCard = screen.getByRole('button', { name: 'Blue' })
    expect(blueCard).toHaveAttribute('aria-pressed', 'true')
  })
})
