// Lists Nigerian banks for the seller application form.
import { json, serve } from '../_shared/http.ts'
import { paystack } from '../_shared/paystack.ts'

let cache: { at: number; banks: { name: string; code: string }[] } | null = null

serve(async () => {
  if (!cache || Date.now() - cache.at > 6 * 60 * 60 * 1000) {
    const banks = await paystack.listBanks()
    cache = { at: Date.now(), banks: banks.map((b) => ({ name: b.name, code: b.code })) }
  }
  return json({ banks: cache.banks })
})
