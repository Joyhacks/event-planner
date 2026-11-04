import { CURRENCIES } from '../data/catalog'
import type { Currency } from '../data/types'

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** ₦18.5M style, for headline numbers. */
export function formatMoneyCompact(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

/** Accepts "1,500,000", "1500000", "1.5m", "250k". Returns NaN when unreadable. */
export function parseAmount(input: string): number {
  const clean = input.trim().toLowerCase().replace(/[,\s₦$]/g, '')
  if (clean === '') return NaN
  const match = /^(\d+(?:\.\d+)?)([km]?)$/.exec(clean)
  if (!match) return NaN
  const base = Number(match[1])
  const mult = match[2] === 'm' ? 1_000_000 : match[2] === 'k' ? 1_000 : 1
  return Math.round(base * mult)
}

/** Marketplace amounts are stored in kobo. */
export function naira(kobo: number): string {
  return formatMoney(kobo / 100, 'NGN')
}

/** "5,000" or "5k" typed by a seller, in naira, to kobo. NaN when unreadable. */
export function nairaInputToKobo(input: string): number {
  const n = parseAmount(input)
  return Number.isNaN(n) ? NaN : n * 100
}
