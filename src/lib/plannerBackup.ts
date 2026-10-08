import type { PlannerEvent } from '../data/types'
import { uid } from './id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TYPES = ['trad-wedding', 'white-wedding', 'owambe', 'naming', 'remembrance', 'corporate']
const GROUPS = ['family', 'friends', 'colleagues', 'faith', 'vip']
const CATEGORIES = [
  'venue',
  'catering',
  'drinks',
  'decor',
  'entertainment',
  'media',
  'attire',
  'souvenirs',
  'logistics',
  'other',
]
export const MAX_BACKUP_BYTES = 5_000_000

function obj(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid planner record.')
  return value as Record<string, unknown>
}
function str(value: unknown, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()))
    throw new Error('A text field is missing or too long.')
  return value
}
function num(value: unknown, max = 1_000_000_000_000, min = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error('An amount or quantity is invalid.')
  return value
}
function choice(value: unknown, choices: string[]): string {
  if (typeof value !== 'string' || !choices.includes(value)) throw new Error('Unrecognised planner option.')
  return value
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error('Invalid record ID.')
  return value
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('Invalid or oversized planner list.')
  return value
}
function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid planner status.')
  return value
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}
function uniqueIds(rows: { id: string }[]) {
  if (new Set(rows.map((r) => r.id)).size !== rows.length) throw new Error('Duplicate record IDs in backup.')
}

/** Validate and reconstruct allowlisted fields. Never spread untrusted imported objects. */
export function parsePlannerEvent(value: unknown): PlannerEvent {
  const e = obj(value)
  if (!validDate(e.date) || !validTime(e.startTime)) throw new Error('Invalid event date or time.')
  const guests = list(e.guests, 5000).map((value) => {
    const g = obj(value)
    return {
      id: id(g.id),
      name: str(g.name, 120, true),
      phone: str(g.phone, 30),
      group: choice(g.group, GROUPS),
      rsvp: choice(g.rsvp, ['yes', 'no', 'maybe', 'pending']),
      plusOnes: num(g.plusOnes, 20),
    }
  })
  const budgetItems = list(e.budgetItems, 1000).map((value) => {
    const b = obj(value)
    return {
      id: id(b.id),
      category: choice(b.category, CATEGORIES),
      label: str(b.label, 120, true),
      planned: num(b.planned),
      paid: num(b.paid),
    }
  })
  const vendors = list(e.vendors, 500).map((value) => {
    const v = obj(value)
    const c = v.custom == null ? null : obj(v.custom)
    return {
      vendorId: str(v.vendorId, 80, true),
      status: choice(v.status, ['enquired', 'booked', 'deposit', 'paid']),
      ...(c
        ? {
            custom: {
              name: str(c.name, 120, true),
              category: choice(c.category, [
                'catering',
                'decor',
                'venue',
                'entertainment',
                'media',
                'attire',
                'small-chops',
                'mc',
              ]),
              phone: str(c.phone, 30),
              notes: str(c.notes, 1000),
              quote: num(c.quote),
            },
          }
        : {}),
    }
  })
  const schedule = list(e.schedule, 1000).map((value) => {
    const s = obj(value)
    if (!validTime(s.time)) throw new Error('Invalid programme time.')
    return { id: id(s.id), time: s.time, title: str(s.title, 160, true), owner: str(s.owner, 80) }
  })
  let asoebi = null
  if (e.asoebi !== null) {
    const a = obj(e.asoebi)
    const price = num(a.pricePerSet, 1_000_000_000_000, 1)
    const buyers = list(a.buyers, 5000).map((value) => {
      const b = obj(value)
      const sets = num(b.sets, 50, 1)
      const amountPaid = b.amountPaid == null ? (bool(b.paid) ? sets * price : 0) : num(b.amountPaid)
      const paymentDate = b.paymentDate == null ? '' : str(b.paymentDate, 10)
      if (paymentDate && !validDate(paymentDate)) throw new Error('Invalid payment date.')
      return {
        id: id(b.id),
        name: str(b.name, 120, true),
        sets,
        paid: amountPaid >= sets * price,
        collected: bool(b.collected),
        amountPaid,
        paymentDate,
        notes: b.notes == null ? '' : str(b.notes, 1000),
      }
    })
    uniqueIds(buyers)
    const colors = list(a.colors, 3).map((c) => {
      if (typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)) throw new Error('Invalid fabric colour.')
      return c
    })
    asoebi = { fabric: str(a.fabric, 120, true), pricePerSet: price, colors, payTo: str(a.payTo, 160), buyers }
  }
  uniqueIds(guests)
  uniqueIds(budgetItems)
  uniqueIds(schedule)
  if (new Set(vendors.map((v) => v.vendorId)).size !== vendors.length) throw new Error('Duplicate vendor IDs.')
  const createdAt = str(e.createdAt, 40, true)
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid creation date.')
  return {
    id: id(e.id),
    title: str(e.title, 80, true),
    type: choice(e.type, TYPES),
    date: e.date,
    startTime: e.startTime,
    venue: str(e.venue, 160),
    city: str(e.city, 80, true),
    currency: choice(e.currency, ['NGN', 'GHS', 'KES', 'ZAR', 'USD']),
    budget: num(e.budget),
    guestTarget: num(e.guestTarget, 20000),
    hosts: str(e.hosts, 160),
    createdAt,
    isSample: e.isSample === true,
    guests,
    budgetItems,
    vendors,
    schedule,
    asoebi,
  } as PlannerEvent
}

export function backupJson(events: PlannerEvent[]): string {
  return JSON.stringify({ format: 'ariya-planner', version: 1, exportedAt: new Date().toISOString(), events }, null, 2)
}
export function parseBackup(text: string): PlannerEvent[] {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error('Backup is too large. Maximum 5 MB.')
  const root = obj(JSON.parse(text.replace(/^\uFEFF/, '')))
  if (root.format !== 'ariya-planner' || root.version !== 1)
    throw new Error('Choose an Ariya planner backup (version 1).')
  return list(root.events, 100).map(parsePlannerEvent)
}
/** Restore as new device copies, leaving existing and shared events untouched. */
export function restoredCopy(e: PlannerEvent): PlannerEvent {
  return {
    ...e,
    id: uid(),
    title: e.title.slice(0, 69) + ' (restored)',
    isSample: false,
    createdAt: new Date().toISOString(),
    guests: e.guests.map((g) => ({ ...g, id: uid() })),
    budgetItems: e.budgetItems.map((b) => ({ ...b, id: uid() })),
    schedule: e.schedule.map((s) => ({ ...s, id: uid() })),
    asoebi: e.asoebi ? { ...e.asoebi, buyers: e.asoebi.buyers.map((b) => ({ ...b, id: uid() })) } : null,
  }
}
