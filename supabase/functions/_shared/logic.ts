// Pure helpers shared by the Edge Functions. Unit-tested with Vitest.

export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '')
  return base.length >= 3 ? base : `seller-${base || 'x'}`
}

/** Loose match between the name a seller typed and the bank's account name. */
export function namesLookRelated(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toUpperCase()
        .replace(/[^A-Z ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2),
    )
  const wa = words(a)
  for (const w of words(b)) if (wa.has(w)) return true
  return false
}

export interface PaystackCharge {
  status: string
  reference: string
  amount: number
  currency: string
  id: number | string
}

/** Everything that must be true before an order is fulfilled. */
export function chargeProblem(charge: PaystackCharge, expected: { reference: string; total_kobo: number }): string | null {
  if (charge.status !== 'success') return `status is ${charge.status}`
  if (charge.reference !== expected.reference) return 'reference mismatch'
  if (charge.currency !== 'NGN') return `currency is ${charge.currency}`
  return null
}

export function isNigerianAccountNumber(v: string): boolean {
  return /^[0-9]{10}$/.test(v)
}
