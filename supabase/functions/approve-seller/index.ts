// Admin approves a seller: create their Paystack subaccount, then activate them.
import { HttpError, json, serve } from '../_shared/http.ts'
import { slugify } from '../_shared/logic.ts'
import { paystack } from '../_shared/paystack.ts'
import { db, requireAdmin } from '../_shared/supabase.ts'

interface Application {
  id: string
  user_id: string
  status: string
  business_name: string
  bank_code: string
  account_number: string
  phone: string
}

serve(async (req) => {
  const reviewer = await requireAdmin(req)
  const { application_id } = await req.json().catch(() => ({}))
  if (typeof application_id !== 'string') throw new HttpError(400, 'Missing application')
  const app = await db.one<Application>('seller_applications', `select=*&${db.eq('id', application_id)}`)
  if (!app || app.status !== 'pending') throw new HttpError(404, 'Application not found or already reviewed')

  const settings = await db.one<{ commission_bps: number }>('platform_settings', 'select=commission_bps')
  const sub = await paystack.createSubaccount({
    business_name: app.business_name,
    settlement_bank: app.bank_code,
    account_number: app.account_number,
    // Default split; every transaction also sets an exact transaction_charge.
    percentage_charge: (settings?.commission_bps ?? 500) / 100,
    primary_contact_phone: app.phone,
  })

  // Unique slug for the seller's public page.
  const base = slugify(app.business_name)
  let slug = base
  for (let i = 2; ; i++) {
    const taken = await db.one<{ user_id: string }>('sellers', `select=user_id&${db.eq('slug', slug)}`)
    if (!taken || taken.user_id === app.user_id) break
    slug = `${base.slice(0, 45)}-${i}`
  }

  await db.rpc('finalize_seller_approval', {
    p_application: app.id,
    p_subaccount: sub.subaccount_code,
    p_slug: slug,
    p_admin: reviewer.id,
  })
  return json({ ok: true, slug })
})
