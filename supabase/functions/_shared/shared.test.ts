import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { chargeProblem, isNigerianAccountNumber, namesLookRelated, slugify } from './logic'
import { hmacSha512Hex, timingSafeEqual, verifyPaystackSignature } from './signature'

describe('Paystack webhook signature', () => {
  const secret = 'sk_test_secret'
  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'ARY-1', amount: 500000 } })
  const good = createHmac('sha512', secret).update(body).digest('hex')

  it('matches Node HMAC-SHA512', async () => {
    expect(await hmacSha512Hex(secret, body)).toBe(good)
  })
  it('accepts a correct signature', async () => {
    expect(await verifyPaystackSignature(body, good, secret)).toBe(true)
  })
  it('rejects tampered bodies, wrong keys and missing headers', async () => {
    expect(await verifyPaystackSignature(body.replace('500000', '5'), good, secret)).toBe(false)
    expect(await verifyPaystackSignature(body, good, 'sk_other')).toBe(false)
    expect(await verifyPaystackSignature(body, null, secret)).toBe(false)
    expect(await verifyPaystackSignature(body, good, '')).toBe(false)
  })
  it('compares in constant time', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true)
    expect(timingSafeEqual('abc', 'abd')).toBe(false)
    expect(timingSafeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('charge verification', () => {
  const order = { reference: 'ARY-1', total_kobo: 500000 }
  const ok = { status: 'success', reference: 'ARY-1', amount: 500000, currency: 'NGN', id: 1 }
  it('passes a matching successful charge', () => {
    expect(chargeProblem(ok, order)).toBeNull()
  })
  it('catches failed, foreign-currency and mismatched charges', () => {
    expect(chargeProblem({ ...ok, status: 'failed' }, order)).toMatch(/status/)
    expect(chargeProblem({ ...ok, currency: 'USD' }, order)).toMatch(/currency/)
    expect(chargeProblem({ ...ok, reference: 'ARY-2' }, order)).toMatch(/reference/)
  })
})

describe('seller helpers', () => {
  it('slugifies business names, including Yoruba diacritics', () => {
    expect(slugify('Ẹwà Décor House!')).toBe('ewa-decor-house')
    expect(slugify('A')).toBe('seller-a')
  })
  it('validates 10-digit NUBAN account numbers', () => {
    expect(isNigerianAccountNumber('0123456789')).toBe(true)
    expect(isNigerianAccountNumber('012345678')).toBe(false)
    expect(isNigerianAccountNumber('01234567890')).toBe(false)
  })
  it('spots when the bank account name relates to the applicant', () => {
    expect(namesLookRelated('Sola Adebayo Sola Events', 'ADEBAYO SOLA OLUWASEUN')).toBe(true)
    expect(namesLookRelated('Sola Events', 'CHUKWUDI OKAFOR')).toBe(false)
  })
})
