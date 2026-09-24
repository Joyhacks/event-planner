// Sends queued refunds to Paystack. Run by an admin from the dashboard or by a
// scheduled job with the CRON_SECRET header.
import { json, serve } from '../_shared/http.ts'
import { paystack } from '../_shared/paystack.ts'
import { timingSafeEqual } from '../_shared/signature.ts'
import { db, requireAdmin } from '../_shared/supabase.ts'

interface QueuedRefund {
  id: string
  amount_kobo: number
  orders: { reference: string; paystack_transaction_id: string | null }
}

serve(async (req) => {
  const cron = Deno.env.get('CRON_SECRET')
  const header = req.headers.get('x-cron-secret')
  if (!(cron && header && timingSafeEqual(cron, header))) await requireAdmin(req)

  const queue = await db.many<QueuedRefund>(
    'refunds',
    'select=id,amount_kobo,orders(reference,paystack_transaction_id)&status=in.(pending,failed)&order=created_at&limit=25',
  )

  const results = []
  for (const r of queue) {
    try {
      const res = await paystack.refund(r.orders.paystack_transaction_id ?? r.orders.reference, r.amount_kobo)
      await db.update('refunds', db.eq('id', r.id), { status: 'processing', paystack_refund_id: String(res.id), last_error: null })
      results.push({ id: r.id, status: 'processing' })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await db.rpc('mark_refund', { p_refund: r.id, p_ok: false, p_paystack_id: null, p_error: message })
      results.push({ id: r.id, status: 'failed', error: message })
    }
  }
  return json({ processed: results.length, results })
})
