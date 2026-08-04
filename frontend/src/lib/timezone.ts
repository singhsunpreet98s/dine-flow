// Parses a UTC ISO string to a Date, tolerating a missing 'Z' suffix.
// SQL Server / EF Core may omit the 'Z'; without it browsers treat the string
// as local time, which shifts timestamps by the user's UTC offset.
export function toUtcDate(iso: string): Date {
  return new Date(/(Z|[+-]\d{2}:\d{2})$/.test(iso) ? iso : iso + 'Z')
}

// Formats a UTC ISO string into the user's local timezone for display.
export function formatInTz(
  utcIso: string,
  timeZoneId: string,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true },
): string {
  try {
    return new Intl.DateTimeFormat('en-IN', { timeZone: timeZoneId, ...opts }).format(toUtcDate(utcIso))
  } catch {
    // Fall back to UTC if the timezone ID is invalid
    return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...opts }).format(toUtcDate(utcIso))
  }
}

export function formatDateInTz(utcIso: string, timeZoneId: string): string {
  return formatInTz(utcIso, timeZoneId, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
