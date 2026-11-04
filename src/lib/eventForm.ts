import type { Currency, EventType } from '../data/types'
import type { NewEventInput } from '../store/planner'
import { daysUntil } from './dates'
import { parseAmount } from './money'
import { validDate, validTime } from './plannerBackup'

export interface EventFormValues {
  title: string
  type: EventType
  date: string
  startTime: string
  venue: string
  city: string
  currency: Currency
  budget: string
  guestTarget: string
  hosts: string
}

export type EventFormErrors = Partial<Record<keyof EventFormValues, string>>

export function emptyEventForm(): EventFormValues {
  return {
    title: '',
    type: 'trad-wedding',
    date: '',
    startTime: '12:00',
    venue: '',
    city: 'Lagos',
    currency: 'NGN',
    budget: '',
    guestTarget: '',
    hosts: '',
  }
}

export function eventToForm(e: NewEventInput): EventFormValues {
  return {
    ...e,
    budget: e.budget ? e.budget.toLocaleString('en-NG') : '',
    guestTarget: e.guestTarget ? String(e.guestTarget) : '',
  }
}

export function validateEventForm(v: EventFormValues, opts: { allowPast?: boolean; now?: Date } = {}) {
  const errors: EventFormErrors = {}
  if (!v.title.trim()) errors.title = 'Give the event a name, e.g. “Adaeze & Tobi” or “Mummy’s 60th”.'
  else if (v.title.trim().length > 80) errors.title = 'Keep the name under 80 characters.'

  if (!validDate(v.date)) errors.date = 'Pick a valid date for the event.'
  else if (!opts.allowPast && daysUntil(v.date, opts.now) < 0) errors.date = 'That date has already passed.'

  if (!validTime(v.startTime)) errors.startTime = 'Pick a valid start time.'
  if (!v.city.trim() || v.city.trim().length > 80) errors.city = 'Enter a city up to 80 characters.'
  if (v.venue.trim().length > 160) errors.venue = 'Keep the venue under 160 characters.'
  if (v.hosts.trim().length > 160) errors.hosts = 'Keep the hosts under 160 characters.'

  const budget = v.budget.trim() === '' ? 0 : parseAmount(v.budget)
  if (!Number.isSafeInteger(budget) || budget < 0 || budget > 1e12)
    errors.budget = 'Enter a whole amount up to 1 trillion, e.g. 5,000,000 or 5m.'

  const guests = v.guestTarget.trim() === '' ? 0 : Number(v.guestTarget)
  if (!Number.isInteger(guests) || guests < 0) errors.guestTarget = 'Enter a whole number of guests.'
  else if (guests > 20000) errors.guestTarget = 'That is a stadium. Enter up to 20,000.'

  const ok = Object.keys(errors).length === 0
  const input: NewEventInput | null = ok
    ? {
        title: v.title.trim(),
        type: v.type,
        date: v.date,
        startTime: v.startTime,
        venue: v.venue.trim(),
        city: v.city.trim(),
        currency: v.currency,
        budget,
        guestTarget: guests,
        hosts: v.hosts.trim(),
      }
    : null
  return { errors, input }
}
