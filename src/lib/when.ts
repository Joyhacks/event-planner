const dateFmt = new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' })

/** "Sat, 19 Dec 2026 · 4:00 pm" in the viewer's time zone. */
export function formatWhen(iso: string): string {
  const d = new Date(iso)
  return `${dateFmt.format(d)} · ${timeFmt.format(d)}`
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null
}

/** A downloadable calendar entry for an event. */
export function icsFor(e: { title: string; starts_at: string; ends_at: string | null; venue: string; city: string; url: string }): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 5 * 3600 * 1000).toISOString()
  const esc = (s: string) => s.replace(/[\\,;]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ariya//Events//EN',
    'BEGIN:VEVENT',
    `UID:${stamp(e.starts_at)}-${encodeURIComponent(e.title)}@ariya`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.starts_at)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc([e.venue, e.city].filter(Boolean).join(', '))}`,
    `URL:${e.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
