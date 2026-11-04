// Paystack → Ariya. Signature-checked, then re-verified with Paystack's API
// before anything is fulfilled. Valid signatures always get a 200 so Paystack
// does not retry forever; failures are logged and flagged instead.
import { json } from '../_shared/http.ts'
import { confirmPayment } from '../_shared/confirm.ts'
import { paystack } from '../_shared/paystack.ts'
import { verifyPaystackSignature } from '../_shared/signature.ts'
import { db } from '../_shared/supabase.ts'

async function refundFor(reference: string) {
  const order = await db.one<{ id: string }>('orders', `select=id&${db.eq('reference', reference)}`)
  return order ? db.one<{ id: string }>('refunds', `select=id&${db.eq('order_id', order.id)}`) : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const raw = await req.text()
  const valid = await verifyPaystackSignature(raw, req.headers.get('x-paystack-signature'), paystack.secret)
  if (!valid) return new Response('Invalid signature', { status: 401 })

  const event = JSON.parse(raw)
  try {
    if (event.event === 'charge.success') {
      await confirmPayment(String(event.data?.reference ?? ''))
    } else if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      const reference = String(event.data?.transaction_reference ?? event.data?.transaction?.reference ?? '')
      const refund = await refundFor(reference)
      if (refund) {
        const ok = event.event === 'refund.processed'
        await db.rpc('mark_refund', {
          p_refund: refund.id,
          p_ok: ok,
          p_paystack_id: ok ? String(event.data?.id ?? '') : null,
          p_error: ok ? null : 'Paystack refund failed',
        })
      }
    }
  } catch (err) {
    console.error('webhook handling failed', event.event, err instanceof Error ? err.message : err)
  }
  return json({ received: true })
})
