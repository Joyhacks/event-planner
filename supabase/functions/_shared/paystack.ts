import { HttpError } from './http.ts'

const base = Deno.env.get('PAYSTACK_BASE_URL') ?? 'https://api.paystack.co'
const secret = Deno.env.get('PAYSTACK_SECRET_KEY') ?? ''

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!secret) throw new HttpError(500, 'Payments are not configured yet')
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok || payload.status === false) {
    throw new HttpError(res.status >= 500 ? 502 : 400, payload.message ?? 'Paystack request failed')
  }
  return payload.data as T
}

export interface Bank {
  name: string
  code: string
}

export const paystack = {
  secret,
  listBanks: () => call<Bank[]>('GET', '/bank?country=nigeria&perPage=100'),
  resolveAccount: (accountNumber: string, bankCode: string) =>
    call<{ account_name: string; account_number: string }>(
      'GET',
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    ),
  createSubaccount: (input: {
    business_name: string
    settlement_bank: string
    account_number: string
    percentage_charge: number
    primary_contact_phone?: string
  }) => call<{ subaccount_code: string }>('POST', '/subaccount', input),
  initialize: (input: Record<string, unknown>) =>
    call<{ authorization_url: string; access_code: string; reference: string }>('POST', '/transaction/initialize', input),
  verify: (reference: string) =>
    call<{ id: number; status: string; reference: string; amount: number; currency: string }>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`,
    ),
  refund: (transaction: string, amount: number) =>
    call<{ id: number; status: string }>('POST', '/refund', { transaction, amount }),
}
