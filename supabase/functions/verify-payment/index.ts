// Called when the buyer lands back from Paystack, in case the webhook is slow.
import { HttpError, json, serve } from '../_shared/http.ts'
import { confirmPayment } from '../_shared/confirm.ts'
import { db, requireUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const user = await requireUser(req)
  const { reference } = await req.json().catch(() => ({}))
  if (typeof reference !== 'string') throw new HttpError(400, 'Missing order')
  const order = await db.one<{ buyer_id: string }>('orders', `select=buyer_id&${db.eq('reference', reference)}`)
  if (!order || order.buyer_id !== user.id) throw new HttpError(404, 'Order not found')
  return json(await confirmPayment(reference))
})
