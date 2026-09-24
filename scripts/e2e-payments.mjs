// End-to-end payment flow against a local Supabase + fake Paystack.
// Needs: `supabase start`, `supabase functions serve --env-file supabase/functions/.env`,
// and `node scripts/fake-paystack.mjs`. Never point this at production.
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const FAKE = 'http://127.0.0.1:4010'
if (!ANON || !SERVICE || !URL.includes('127.0.0.1')) throw new Error('Local Supabase only: set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY')

const service = createClient(URL, SERVICE, { auth: { persistSession: false } })
let passed = 0
const ok = (cond, what) => {
  if (!cond) throw new Error('FAILED: ' + what)
  passed++
  console.log('ok  ' + what)
}
const run = Date.now().toString(36)

async function user(name, email) {
  const { data, error } = await service.auth.admin.createUser({
    email, password: 'test-password-1', email_confirm: true, user_metadata: { full_name: name },
  })
  if (error) throw error
  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  await client.auth.signInWithPassword({ email, password: 'test-password-1' })
  return { id: data.user.id, client }
}
const fake = (path) => fetch(FAKE + path).then((r) => r.json())

const admin = await user('Ada Admin', `admin-${run}@ariya.test`)
const seller = await user('Sola Adebayo', `seller-${run}@ariya.test`)
const buyer = await user('Bisi Buyer', `buyer-${run}@ariya.test`)
await service.from('profiles').update({ role: 'super_admin' }).eq('id', admin.id)

// Seller onboarding ---------------------------------------------------------
{
  const bad = await seller.client.functions.invoke('seller-apply', { body: { business_name: 'Sola Events', phone: '08030000000', bank_code: '058', bank_name: 'GTBank', account_number: '0000000000' } })
  ok(bad.error, 'unresolvable bank account is rejected')
  const res = await seller.client.functions.invoke('seller-apply', { body: { business_name: 'Sola Events', phone: '08030000000', bank_code: '058', bank_name: 'GTBank', account_number: '0123456789' } })
  ok(res.data?.account_name === 'SOLA ADEBAYO' && res.data?.name_matches === true, 'bank account name resolved and matched to applicant')
  const denied = await buyer.client.functions.invoke('approve-seller', { body: {} })
  ok(denied.error, 'non-admins cannot approve sellers')
  const { data: app } = await admin.client.from('seller_applications').select('id').eq('user_id', seller.id).single()
  const approved = await admin.client.functions.invoke('approve-seller', { body: { application_id: app.id } })
  if (!approved.data?.ok) console.log('approve response:', approved.error?.message, await approved.error?.context?.text?.())
  ok(approved.data?.ok, 'admin approval creates the Paystack subaccount')
  const { data: payout } = await service.from('seller_payout_accounts').select('subaccount_code, account_last4').eq('user_id', seller.id).single()
  ok(payout.subaccount_code.startsWith('ACCT_0123456789') && payout.account_last4 === '6789', 'payout account stored, only last 4 digits kept')
  await seller.client.auth.refreshSession()
}

// Event setup ------------------------------------------------------------------
const slug = `detty-${run}`
const { data: ev, error: evErr } = await seller.client.from('events').insert({
  seller_id: seller.id, slug, title: 'Detty Owambe', city: 'Lagos', status: 'published',
  starts_at: new Date(Date.now() + 30 * 864e5).toISOString(), fee_bearer: 'buyer',
}).select().single()
ok(!evErr && ev, 'seller publishes an event through RLS')
const { data: tt } = await seller.client.from('ticket_types').insert({ event_id: ev.id, name: 'Regular', price_kobo: 500000, quantity: 100 }).select().single()

// Purchase -----------------------------------------------------------------------
async function buy(qty = 2) {
  const { data, error } = await buyer.client.rpc('create_order', { p_event: ev.id, p_items: [{ ticket_type_id: tt.id, quantity: qty }], p_buyer_name: 'Bisi Buyer' })
  if (error) throw error
  return data
}
const order = await buy()
const checkout = await buyer.client.functions.invoke('checkout', { body: { reference: order.reference } })
ok(checkout.data?.authorization_url?.includes(order.reference), 'checkout returns a Paystack payment link')
const init = (await fake(`/__init?ref=${order.reference}`)).data
ok(init.amount === order.total_kobo, 'Paystack is asked for the server-calculated total')
ok(init.subaccount?.startsWith('ACCT_0123456789'), 'payment is split to the seller subaccount')
ok(init.transaction_charge > 0 && init.bearer === 'account', 'platform takes commission + fee; buyer-paid fee borne by platform account')
const stranger = await buyer.client.functions.invoke('checkout', { body: { reference: 'ARY-NOTREAL' } })
ok(stranger.error, 'unknown order references are refused')

const forged = (await fake(`/__forged?ref=${order.reference}`)).data
ok(forged.webhook === 401, 'forged webhook signature is rejected')
let { data: o1 } = await service.from('orders').select('status').eq('reference', order.reference).single()
ok(o1.status === 'pending', 'forged webhook changed nothing')

const paid = (await fake(`/__pay?ref=${order.reference}`)).data
ok(paid.webhook === 200, 'signed webhook accepted')
;({ data: o1 } = await service.from('orders').select('status').eq('reference', order.reference).single())
ok(o1.status === 'paid', 'order paid after Paystack verification')
const { data: mine } = await buyer.client.from('tickets').select('code').eq('order_id', order.order_id)
ok(mine.length === 2, 'buyer can load their 2 QR tickets')
const again = await buyer.client.functions.invoke('verify-payment', { body: { reference: order.reference } })
ok(again.data?.status === 'paid', 'return-from-checkout verification is idempotent')
const { count } = await service.from('tickets').select('*', { count: 'exact', head: true }).eq('order_id', order.order_id)
ok(count === 2, 'no duplicate tickets after repeated confirmation')

// Underpayment is flagged ---------------------------------------------------------
const cheap = await buy(1)
await buyer.client.functions.invoke('checkout', { body: { reference: cheap.reference } })
await fake(`/__pay?ref=${cheap.reference}&amount=100`)
const { data: o2 } = await service.from('orders').select('status').eq('reference', cheap.reference).single()
ok(o2.status === 'flagged', 'underpaid order is flagged, not fulfilled')
const { data: flags } = await admin.client.from('flagged_transactions').select('reason')
ok(flags.some((f) => f.reason === 'amount_mismatch'), 'admin sees the flag')

// Cancellation and refunds ---------------------------------------------------------
const { data: n } = await seller.client.rpc('cancel_event', { p_event: ev.id, p_reason: 'Venue withdrew' })
ok(n === 1, 'cancelling queues a refund for the paid order')
const run1 = await admin.client.functions.invoke('process-refunds', { body: {} })
ok(run1.data?.results?.[0]?.status === 'processing', 'refund sent to Paystack')
const cronDenied = await fetch(`${URL}/functions/v1/process-refunds`, { method: 'POST', headers: { 'x-cron-secret': 'wrong' } })
ok(cronDenied.status === 401, 'refund worker refuses a wrong cron secret')
await fake(`/__refunded?ref=${order.reference}`)
;({ data: o1 } = await service.from('orders').select('status').eq('reference', order.reference).single())
ok(o1.status === 'refunded', 'refund.processed webhook completes the refund')

// Live leaderboard ------------------------------------------------------------------
const { data: ev2 } = await seller.client.from('events').insert({
  seller_id: seller.id, slug: `pageant-${run}`, title: 'Face of Lagos', city: 'Lagos', status: 'published',
  starts_at: new Date(Date.now() + 30 * 864e5).toISOString(), fee_bearer: 'seller',
}).select().single()
const { data: contest } = await seller.client.from('contests').insert({
  event_id: ev2.id, title: 'Face of Lagos', permit_confirmed: true,
  voting_starts_at: new Date(Date.now() - 864e5).toISOString(), voting_ends_at: new Date(Date.now() + 864e5).toISOString(),
}).select().single()
const { data: contestant } = await seller.client.from('contestants').insert({ contest_id: contest.id, display_name: 'Amaka' }).select().single()
const { data: pkg } = await seller.client.from('vote_packages').insert({ contest_id: contest.id, votes: 10, price_kobo: 50000 }).select().single()

const viewer = createClient(URL, ANON, { auth: { persistSession: false } })
const live = new Promise((resolve) => {
  const channel = viewer
    .channel('board')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'contestants', filter: `contest_id=eq.${contest.id}` }, (p) => resolve(p.new.votes_count))
    .subscribe()
  setTimeout(() => resolve(null), 15000)
  return channel
})
await new Promise((r) => setTimeout(r, 1500))
const { data: vo } = await buyer.client.rpc('create_vote_order', { p_package: pkg.id, p_contestant: contestant.id, p_quantity: 2 })
await buyer.client.functions.invoke('checkout', { body: { reference: vo.reference } })
const voteInit = (await fake(`/__init?ref=${vo.reference}`)).data
ok(voteInit.bearer === 'subaccount', 'seller-paid fee: subaccount bears the Paystack fee')
await fake(`/__pay?ref=${vo.reference}`)
ok((await live) === 20, 'anonymous leaderboard receives the new vote count live')
await viewer.removeAllChannels()

console.log(`\nALL ${passed} PAYMENT E2E CHECKS PASSED`)
process.exit(0)
