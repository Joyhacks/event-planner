// Starts Paystack checkout for an order the buyer already created with the
// create_order / create_vote_order database functions. Amounts come from the
// database, never from the browser.
import { HttpError, json, serve } from '../_shared/http.ts'
import { paystack } from '../_shared/paystack.ts'
import { db, requireUser } from '../_shared/supabase.ts'

interface Order {
  id: string
  reference: string
  buyer_id: string
  buyer_email: string
  event_id: string
  kind: string
  status: string
  total_kobo: number
  platform_charge_kobo: number
  fee_bearer: 'buyer' | 'seller'
  expires_at: string
}

serve(async (req) => {
  const user = await requireUser(req)
  const { reference, callback_url } = await req.json().catch(() => ({}))
  if (typeof reference !== 'string') throw new HttpError(400, 'Missing order')

  const order = await db.one<Order>(
    'orders',
    `select=id,reference,buyer_id,buyer_email,event_id,kind,status,total_kobo,platform_charge_kobo,fee_bearer,expires_at&${db.eq('reference', reference)}`,
  )
  if (!order || order.buyer_id !== user.id) throw new HttpError(404, 'Order not found')
  if (order.status !== 'pending') throw new HttpError(409, 'This order is already ' + order.status)
  if (new Date(order.expires_at) < new Date()) throw new HttpError(410, 'Your hold expired. Please start again.')
  if (order.total_kobo <= 0) throw new HttpError(400, 'Nothing to pay')

  const event = await db.one<{ seller_id: string; title: string }>('events', `select=seller_id,title&${db.eq('id', order.event_id)}`)
  const payout = await db.one<{ subaccount_code: string }>(
    'seller_payout_accounts',
    `select=subaccount_code&${db.eq('user_id', event!.seller_id)}`,
  )
  if (!payout) throw new HttpError(409, 'This organiser cannot receive payments yet')

  const origin = Deno.env.get('APP_ORIGIN') ?? 'http://localhost:5173'
  const safeCallback =
    typeof callback_url === 'string' && callback_url.startsWith(origin + '/') ? callback_url : `${origin}/checkout/return`

  const init = await paystack.initialize({
    email: order.buyer_email,
    amount: order.total_kobo,
    currency: 'NGN',
    reference: order.reference,
    callback_url: safeCallback,
    subaccount: payout.subaccount_code,
    // Exact platform share: commission (+ the fee when the buyer pays it).
    transaction_charge: order.platform_charge_kobo,
    // Who absorbs Paystack's fee: the platform when the buyer paid it on top.
    bearer: order.fee_bearer === 'buyer' ? 'account' : 'subaccount',
    metadata: { order_id: order.id, kind: order.kind, event: event!.title },
  })
  return json({ authorization_url: init.authorization_url, reference: init.reference })
})
