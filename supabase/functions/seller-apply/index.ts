// A signed-in user applies to sell tickets. The bank account is checked with
// Paystack first, so admins only ever see applications with a real account name.
import { HttpError, json, serve } from '../_shared/http.ts'
import { isNigerianAccountNumber, namesLookRelated } from '../_shared/logic.ts'
import { paystack } from '../_shared/paystack.ts'
import { db, requireUser } from '../_shared/supabase.ts'

serve(async (req) => {
  const user = await requireUser(req)
  const body = await req.json().catch(() => ({}))
  const business = String(body.business_name ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  const bankCode = String(body.bank_code ?? '').trim()
  const bankName = String(body.bank_name ?? '').trim()
  const accountNumber = String(body.account_number ?? '').trim()

  if (business.length < 2) throw new HttpError(400, 'Enter your business or brand name')
  if (!/^\+?[0-9 ]{7,20}$/.test(phone)) throw new HttpError(400, 'Enter a valid phone number')
  if (!bankCode || !bankName) throw new HttpError(400, 'Choose your bank')
  if (!isNigerianAccountNumber(accountNumber)) throw new HttpError(400, 'Account numbers have 10 digits')

  const pending = await db.one('seller_applications', `select=id&${db.eq('user_id', user.id)}&status=eq.pending`)
  if (pending) throw new HttpError(409, 'You already have an application under review')

  const resolved = await paystack.resolveAccount(accountNumber, bankCode).catch(() => {
    throw new HttpError(400, 'We could not find that account. Check the number and bank.')
  })

  const profile = await db.one<{ full_name: string }>('profiles', `select=full_name&${db.eq('id', user.id)}`)
  await db.insert('seller_applications', {
    user_id: user.id,
    business_name: business,
    phone,
    instagram: String(body.instagram ?? '').trim().slice(0, 80),
    about: String(body.about ?? '').trim().slice(0, 1000),
    bank_code: bankCode,
    bank_name: bankName,
    account_number: accountNumber,
    account_name: resolved.account_name,
  })

  return json({
    account_name: resolved.account_name,
    name_matches: namesLookRelated(`${profile?.full_name ?? ''} ${business}`, resolved.account_name),
  })
})
