import { HttpError } from './http.ts'
import { chargeProblem } from './logic.ts'
import { paystack } from './paystack.ts'
import { db } from './supabase.ts'

interface Order {
  id: string
  reference: string
  total_kobo: number
  status: string
}

/**
 * Asks Paystack directly whether `reference` was paid, then fulfils the order.
 * Used by both the webhook and the buyer's return from checkout, so a missed
 * webhook never leaves a paying customer without tickets. Idempotent.
 */
export async function confirmPayment(reference: string) {
  const order = await db.one<Order>('orders', `select=id,reference,total_kobo,status&${db.eq('reference', reference)}`)
  if (!order) throw new HttpError(404, 'Order not found')
  if (order.status !== 'pending' && order.status !== 'expired') return { status: order.status }

  const charge = await paystack.verify(reference)
  const problem = chargeProblem(charge, order)
  if (problem) {
    if (charge.status === 'success') {
      await db.insert('flagged_transactions', {
        order_id: order.id,
        reason: 'verification_failed',
        details: { problem, charge_id: charge.id, currency: charge.currency, amount: charge.amount },
      })
    }
    return { status: order.status, problem }
  }

  return db.rpc<{ status: string }>('fulfil_order', {
    p_reference: reference,
    p_paid_kobo: charge.amount,
    p_transaction_id: String(charge.id),
  })
}
