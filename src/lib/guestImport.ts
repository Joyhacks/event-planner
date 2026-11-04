import type { Guest, GuestGroup, Rsvp } from '../data/types'

export function parseCsv(text: string): string[][] {
  if (new TextEncoder().encode(text).length > 2_000_000) throw new Error('CSV is too large. Maximum 2 MB.')
  text = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') {
        quoted = false
        closed = true
      } else cell += c
    } else if (c === '"' && !cell && !closed) {
      quoted = true
    } else if (c === ',') {
      row.push(cell)
      cell = ''
      closed = false
    } else if (c === '\r' || c === '\n') {
      row.push(cell)
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
      cell = ''
      closed = false
      if (c === '\r' && text[i + 1] === '\n') i++
    } else {
      if (closed || c === '"') throw new Error('CSV contains an invalid quoted field.')
      cell += c
    }
  }
  if (quoted) throw new Error('CSV has an unclosed quoted field.')
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  if (rows.length > 5001) throw new Error('Import at most 5,000 guests at a time.')
  return rows
}
const key = (g: Pick<Guest, 'name' | 'phone'>) => `${g.name.trim().toLowerCase()}|${g.phone.replace(/\D/g, '')}`
export function importGuestsCsv(text: string, existing: Guest[] = []) {
  const [header, ...rows] = parseCsv(text)
  if (!header) throw new Error('CSV is empty.')
  const columns = header.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[\s_-]/g, ''),
  )
  if (!columns.includes('name')) throw new Error('CSV needs a Name column. Download the template first.')
  if (new Set(columns).size !== columns.length) throw new Error('CSV has duplicate column headings.')
  const known = new Set(existing.map(key))
  const guests: Omit<Guest, 'id'>[] = []
  let skipped = 0
  for (const [index, row] of rows.entries()) {
    const get = (col: string) => row[columns.indexOf(col)]?.trim() || ''
    const name = get('name'),
      phone = get('phone'),
      groupText = get('group').toLowerCase(),
      reply = get('rsvp').toLowerCase(),
      plusText = get('plusones')
    const groups: Record<string, GuestGroup> = {
      family: 'family',
      friends: 'friends',
      colleagues: 'colleagues',
      'church / mosque': 'faith',
      faith: 'faith',
      vip: 'vip',
    }
    const replies: Record<string, Rsvp> = {
      coming: 'yes',
      yes: 'yes',
      awaiting: 'pending',
      pending: 'pending',
      maybe: 'maybe',
      'not coming': 'no',
      no: 'no',
    }
    const group = groups[groupText || 'family'],
      rsvp = replies[reply || 'pending'],
      plusOnes = Number(plusText || '0')
    if (
      !name ||
      name.length > 120 ||
      phone.length > 30 ||
      !group ||
      !rsvp ||
      !/^\d*$/.test(plusText) ||
      !Number.isInteger(plusOnes) ||
      plusOnes > 20
    )
      throw new Error(`Row ${index + 2}: check name, phone, group, RSVP and plus-ones (0–20).`)
    const guest = { name, phone, group, rsvp, plusOnes }
    if (known.has(key(guest))) {
      skipped++
      continue
    }
    known.add(key(guest))
    guests.push(guest)
  }
  if (existing.length + guests.length > 5000) throw new Error('An event can have at most 5,000 guest entries.')
  return { guests, skipped }
}
