// A tiny stand-in for the Paystack API, for local end-to-end tests only.
// Run: node scripts/fake-paystack.mjs   (listens on :4010)
import { createHmac } from 'node:crypto'
import { createServer } from 'node:http'

const SECRET = process.env.PAYSTACK_SECRET_KEY ?? 'sk_test_fake'
const WEBHOOK = process.env.WEBHOOK_URL ?? 'http://127.0.0.1:54321/functions/v1/paystack-webhook'
const tx = new Map()
let nextId = 1000

const send = (res, status, data, message = 'ok') => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: status < 400, message, data }))
}

async function webhook(event, data) {
  const body = JSON.stringify({ event, data })
  const signature = createHmac('sha512', SECRET).update(body).digest('hex')
  const r = await fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature }, body })
  return r.status
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  let body = ''
  for await (const chunk of req) body += chunk
  const json = body ? JSON.parse(body) : {}
  if (!url.pathname.startsWith('/__') && req.headers.authorization !== `Bearer ${SECRET}`) return send(res, 401, null, 'Invalid key')

  if (req.method === 'GET' && url.pathname === '/bank') return send(res, 200, [{ name: 'Guaranty Trust Bank', code: '058' }, { name: 'Access Bank', code: '044' }])
  if (req.method === 'GET' && url.pathname === '/bank/resolve') {
    const n = url.searchParams.get('account_number')
    if (n === '0000000000') return send(res, 422, null, 'Could not resolve account name')
    return send(res, 200, { account_number: n, account_name: 'SOLA ADEBAYO' })
  }
  if (req.method === 'POST' && url.pathname === '/subaccount') return send(res, 201, { subaccount_code: 'ACCT_' + json.account_number + '_' + nextId++ })
  if (req.method === 'POST' && url.pathname === '/transaction/initialize') {
    tx.set(json.reference, { ...json, id: nextId++, status: 'abandoned' })
    return send(res, 200, { authorization_url: `https://checkout.paystack.test/${json.reference}`, access_code: 'ac', reference: json.reference })
  }
  if (req.method === 'GET' && url.pathname.startsWith('/transaction/verify/')) {
    const t = tx.get(decodeURIComponent(url.pathname.split('/').pop()))
    if (!t) return send(res, 404, null, 'Transaction not found')
    return send(res, 200, { id: t.id, status: t.status, reference: t.reference, amount: t.paidAmount ?? t.amount, currency: 'NGN' })
  }
  if (req.method === 'POST' && url.pathname === '/refund') return send(res, 200, { id: nextId++, status: 'pending' })

  // Test controls ---------------------------------------------------------
  if (url.pathname === '/__init') return send(res, 200, tx.get(url.searchParams.get('ref')) ?? null)
  if (url.pathname === '/__pay') {
    const t = tx.get(url.searchParams.get('ref'))
    if (!t) return send(res, 404, null, 'no tx')
    t.status = 'success'
    if (url.searchParams.get('amount')) t.paidAmount = Number(url.searchParams.get('amount'))
    const status = await webhook('charge.success', { reference: t.reference, amount: t.paidAmount ?? t.amount, id: t.id })
    return send(res, 200, { webhook: status })
  }
  if (url.pathname === '/__forged') {
    const r = await fetch(WEBHOOK, { method: 'POST', headers: { 'x-paystack-signature': 'deadbeef' }, body: JSON.stringify({ event: 'charge.success', data: { reference: url.searchParams.get('ref') } }) })
    return send(res, 200, { webhook: r.status })
  }
  if (url.pathname === '/__refunded') {
    const status = await webhook('refund.processed', { id: nextId++, transaction_reference: url.searchParams.get('ref') })
    return send(res, 200, { webhook: status })
  }
  send(res, 404, null, 'Not found')
}).listen(4010, '0.0.0.0', () => console.log('fake paystack on :4010'))
