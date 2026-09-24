import { describe, expect, it } from 'vitest'
import { createSampleEvent } from '../data/sample'
import { asoebiMessage, whatsappShareUrl } from './asoebi'
import { toCsv } from './csv'
import { countdownLabel, daysUntil, parseLocalDate, toDateInput } from './dates'
import { validateEventForm, emptyEventForm } from './eventForm'
import { formatMoney, parseAmount } from './money'
import { asoebiStats, budgetStats, guestStats, nextEvent } from './stats'

const NOW = new Date(2026, 8, 24, 21, 30) // late evening, catches UTC off-by-one bugs

describe('dates', () => {
  it('parses YYYY-MM-DD as a local date', () => {
    const d = parseLocalDate('2026-12-19')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 11, 19])
  })
  it('round-trips through toDateInput', () => {
    expect(toDateInput(parseLocalDate('2027-01-02'))).toBe('2027-01-02')
  })
  it('counts calendar days regardless of time of day', () => {
    expect(daysUntil('2026-09-24', NOW)).toBe(0)
    expect(daysUntil('2026-09-25', NOW)).toBe(1)
    expect(daysUntil('2026-09-20', NOW)).toBe(-4)
  })
  it('labels the countdown', () => {
    expect(countdownLabel(0)).toBe('Today')
    expect(countdownLabel(1)).toBe('Tomorrow')
    expect(countdownLabel(12)).toBe('In 12 days')
    expect(countdownLabel(-3)).toBe('3 days ago')
  })
})

describe('money', () => {
  it('parses the ways people type amounts', () => {
    expect(parseAmount('1,500,000')).toBe(1_500_000)
    expect(parseAmount('₦250k')).toBe(250_000)
    expect(parseAmount('1.5m')).toBe(1_500_000)
    expect(parseAmount(' 12 000 ')).toBe(12_000)
    expect(parseAmount('abc')).toBeNaN()
    expect(parseAmount('')).toBeNaN()
    expect(parseAmount('-5')).toBeNaN()
  })
  it('formats naira without kobo', () => {
    expect(formatMoney(18_500_000, 'NGN')).toMatch(/18,500,000/)
    expect(formatMoney(18_500_000, 'NGN')).not.toMatch(/\.00/)
  })
})

describe('stats', () => {
  it('counts plus-ones as seats', () => {
    const s = guestStats([
      { id: '1', name: 'A', phone: '', group: 'family', rsvp: 'yes', plusOnes: 2 },
      { id: '2', name: 'B', phone: '', group: 'family', rsvp: 'maybe', plusOnes: 0 },
      { id: '3', name: 'C', phone: '', group: 'family', rsvp: 'no', plusOnes: 1 },
    ])
    expect(s).toEqual({ invites: 3, heads: 6, coming: 3, pending: 1, declined: 2 })
  })
  it('flags over-budget plans', () => {
    const s = budgetStats(
      [
        { id: '1', category: 'venue', label: 'Hall', planned: 700, paid: 200 },
        { id: '2', category: 'catering', label: 'Food', planned: 500, paid: 0 },
      ],
      1000,
    )
    expect(s).toMatchObject({ planned: 1200, paid: 200, outstanding: 1000, unallocated: -200, overBudget: true })
  })
  it('works out aso-ebi money owed', () => {
    const s = asoebiStats({
      fabric: 'x',
      pricePerSet: 100,
      colors: [],
      payTo: '',
      buyers: [
        { id: '1', name: 'A', sets: 2, paid: true, collected: true },
        { id: '2', name: 'B', sets: 3, paid: false, collected: false },
      ],
    })
    expect(s).toEqual({ sets: 5, collected: 2, expected: 500, received: 200, owing: 300 })
  })
  it('picks the soonest event that has not passed', () => {
    const past = { ...createSampleEvent(NOW), id: 'past', date: '2026-01-01' }
    const later = { ...createSampleEvent(NOW), id: 'later', date: '2027-03-01' }
    const soon = { ...createSampleEvent(NOW), id: 'soon', date: '2026-10-10' }
    expect(nextEvent([past, later, soon], NOW)?.id).toBe('soon')
  })
})

describe('event form', () => {
  it('requires a name, a future date and a city', () => {
    const { errors, input } = validateEventForm({ ...emptyEventForm(), date: '2026-01-01' }, { now: NOW })
    expect(input).toBeNull()
    expect(errors.title).toBeTruthy()
    expect(errors.date).toMatch(/passed/)
  })
  it('turns friendly amounts into numbers', () => {
    const { input } = validateEventForm(
      { ...emptyEventForm(), title: ' Mummy’s 60th ', date: '2026-12-05', budget: '7.2m', guestTarget: '300' },
      { now: NOW },
    )
    expect(input).toMatchObject({ title: 'Mummy’s 60th', budget: 7_200_000, guestTarget: 300 })
  })
})

describe('sharing and export', () => {
  it('builds a WhatsApp aso-ebi message', () => {
    const msg = asoebiMessage(createSampleEvent(NOW))
    expect(msg).toContain('Aso-oke, indigo & gold')
    expect(msg).toContain('per set')
    expect(msg).not.toMatch(/\n\n\n/)
    expect(whatsappShareUrl('a b&c')).toBe('https://wa.me/?text=a%20b%26c')
  })
  it('escapes CSV cells and blocks spreadsheet formulas', () => {
    expect(toCsv([['Ade "Big" O', '=HYPERLINK("x")']])).toBe('"Ade ""Big"" O","\'=HYPERLINK(""x"")"')
  })
})

describe('phone numbers', () => {
  it('normalises Nigerian numbers to E.164', async () => {
    const { toE164Nigeria } = await import('./phone')
    expect(toE164Nigeria('0803 123 4567')).toBe('2348031234567')
    expect(toE164Nigeria('+234 803 123 4567')).toBe('2348031234567')
    expect(toE164Nigeria('+44 7700 900123')).toBe('447700900123')
    expect(toE164Nigeria('12345')).toBeNull()
  })
})

describe('monitoring', () => {
  it('strips query strings that may hold sign-in codes', async () => {
    const { scrubUrl } = await import('./monitoring')
    expect(scrubUrl('https://ariya.ng/account/tickets?code=secret')).toBe('https://ariya.ng/account/tickets')
    expect(scrubUrl('https://ariya.ng/e/x')).toBe('https://ariya.ng/e/x')
    expect(scrubUrl(undefined)).toBeUndefined()
  })
})
