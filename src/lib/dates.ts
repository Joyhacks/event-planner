/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const MS_PER_DAY = 86_400_000

/** Whole calendar days from `now` to the event date. Negative once it has passed. */
export function daysUntil(date: string, now: Date = new Date()): number {
  const target = parseLocalDate(date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY)
}

export function countdownLabel(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `In ${days} days`
  if (days === -1) return 'Yesterday'
  return `${Math.abs(days)} days ago`
}

export function formatDate(date: string, style: 'long' | 'short' = 'long'): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: style === 'long' ? 'long' : 'short',
    day: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    year: 'numeric',
  }).format(parseLocalDate(date))
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(2000, 0, 1, h ?? 0, m ?? 0)
  return new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(d)
}
