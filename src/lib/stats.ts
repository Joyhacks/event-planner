import type { Asoebi, BudgetCategory, BudgetItem, Guest, PlannerEvent } from '../data/types'
import { daysUntil } from './dates'

export function guestStats(guests: Guest[]) {
  let heads = 0
  let coming = 0
  let pending = 0
  let declined = 0
  for (const g of guests) {
    const party = 1 + g.plusOnes
    heads += party
    if (g.rsvp === 'yes') coming += party
    else if (g.rsvp === 'no') declined += party
    else pending += party
  }
  return { invites: guests.length, heads, coming, pending, declined }
}

export function budgetStats(items: BudgetItem[], budget: number) {
  const planned = items.reduce((sum, i) => sum + i.planned, 0)
  const paid = items.reduce((sum, i) => sum + i.paid, 0)
  return {
    planned,
    paid,
    outstanding: Math.max(planned - paid, 0),
    unallocated: budget - planned,
    overBudget: planned > budget,
  }
}

export function budgetByCategory(items: BudgetItem[]) {
  const map = new Map<BudgetCategory, { planned: number; paid: number }>()
  for (const i of items) {
    const row = map.get(i.category) ?? { planned: 0, paid: 0 }
    row.planned += i.planned
    row.paid += i.paid
    map.set(i.category, row)
  }
  return [...map.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.planned - a.planned)
}

export function asoebiStats(asoebi: Asoebi | null) {
  if (!asoebi) return { sets: 0, collected: 0, expected: 0, received: 0, owing: 0 }
  let sets = 0
  let collected = 0
  let received = 0
  for (const b of asoebi.buyers) {
    sets += b.sets
    if (b.collected) collected += b.sets
    if (b.paid) received += b.sets * asoebi.pricePerSet
  }
  const expected = sets * asoebi.pricePerSet
  return { sets, collected, expected, received, owing: expected - received }
}

/** The soonest event that has not passed yet. */
export function nextEvent(events: PlannerEvent[], now = new Date()): PlannerEvent | undefined {
  return [...events]
    .filter((e) => daysUntil(e.date, now) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

/** Short, actionable reminders for the overview tab. */
export function nextSteps(event: PlannerEvent): string[] {
  const steps: string[] = []
  const g = guestStats(event.guests)
  if (event.guests.length === 0) steps.push('Start the guest list, even a rough one helps the caterer quote.')
  else if (g.pending > 0) steps.push(`${g.pending} ${g.pending === 1 ? 'guest has' : 'guests have'} not replied yet.`)

  const b = budgetStats(event.budgetItems, event.budget)
  if (b.overBudget) steps.push('Planned spend is above your budget. Trim a line or raise the ceiling.')

  const unpaid = event.vendors.filter((v) => v.status === 'enquired' || v.status === 'booked').length
  if (unpaid > 0) steps.push(`${unpaid} ${unpaid === 1 ? 'vendor is' : 'vendors are'} waiting on a deposit.`)
  if (event.vendors.length === 0) steps.push('No vendors yet. Book the venue and caterer first, they go fastest.')

  const a = asoebiStats(event.asoebi)
  if (event.asoebi && a.owing > 0) steps.push('Some aso-ebi buyers still owe. Send a gentle reminder.')
  if (event.schedule.length === 0) steps.push('Draft the order of events so the MC and DJ are on the same page.')
  return steps
}
