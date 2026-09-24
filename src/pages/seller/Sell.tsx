import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { Button, Field, Input, Pill, Select } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { errorMessage, supabase, unwrap } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Application {
  id: string
  business_name: string
  bank_name: string
  account_name: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string
  created_at: string
}

export default function Sell() {
  return (
    <RequireAuth>
      <Apply />
    </RequireAuth>
  )
}

function Apply() {
  useDocumentTitle('Sell tickets')
  const { user, profile } = useAuth()
  const qc = useQueryClient()
  const apps = useQuery({
    queryKey: ['my-applications', user?.id],
    queryFn: async () =>
      (await unwrap(
        await supabase.from('seller_applications').select('*').order('created_at', { ascending: false }),
      )) as Application[],
  })
  const banks = useQuery({
    queryKey: ['banks'],
    staleTime: 6 * 3600 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('banks', { method: 'GET' })
      if (error) throw new Error(await errorMessage(error))
      return data.banks as { name: string; code: string }[]
    },
  })

  const [form, setForm] = useState({ business_name: '', phone: '', instagram: '', about: '', bank_code: '', account_number: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resolved, setResolved] = useState<{ account_name: string; name_matches: boolean } | null>(null)

  if (profile?.role === 'seller' || profile?.role === 'super_admin') return <Navigate to="/seller" replace />
  if (apps.isLoading) return <PageLoader />
  const latest = apps.data?.[0]

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const bank = banks.data?.find((b) => b.code === form.bank_code)
    const { data, error: err } = await supabase.functions.invoke('seller-apply', {
      body: { ...form, bank_name: bank?.name ?? '' },
    })
    setBusy(false)
    if (err) return setError(await errorMessage(err))
    setResolved(data)
    await qc.invalidateQueries({ queryKey: ['my-applications'] })
  }

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-5 py-14 sm:px-8 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">
          Sell tickets on <em className="hl">Ariya.</em>
        </h1>
        <ul className="mt-6 flex flex-col gap-3 font-medium">
          <li>✦ Money goes straight to your bank account through Paystack. We never hold it.</li>
          <li>✦ Tables, early bird, promo codes, promoter links and free VIP tickets.</li>
          <li>✦ Door scanner that works even when the network drops.</li>
          <li>✦ Voting contests with a live leaderboard.</li>
        </ul>
        <p className="mt-6 text-sm text-ink-soft">
          We check that your bank account is real before approval. Approval usually takes one working day.
        </p>
      </div>

      <div className="lg:col-span-7">
        {latest?.status === 'pending' ? (
          <div className="rounded-lg border-2 border-ink bg-card p-6 shadow-hard" role="status">
            <Pill tone="danfo">Under review</Pill>
            <h2 className="font-display mt-4 text-2xl">Thanks, {latest.business_name}.</h2>
            <p className="mt-2 font-medium">
              Payouts will go to <strong>{latest.account_name}</strong> at {latest.bank_name}. We’ll email you once you are approved.
            </p>
            {resolved && !resolved.name_matches && (
              <p className="mt-4 rounded-md bg-danfo-soft px-3 py-2 text-sm font-bold">
                The account name doesn’t look like your name or business. If that’s expected (e.g. a company account), no action is needed.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-lg border-2 border-ink bg-card p-6 shadow-hard">
            {latest?.status === 'rejected' && (
              <p className="rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
                Your last application was not approved{latest.admin_note ? `: ${latest.admin_note}` : '.'} You can apply again.
              </p>
            )}
            <Field label="Business or brand name">
              {(p) => <Input {...p} value={form.business_name} onChange={set('business_name')} placeholder="Sola Events" />}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Phone">
                {(p) => <Input {...p} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="0803 000 0000" />}
              </Field>
              <Field label="Instagram (optional)">
                {(p) => <Input {...p} value={form.instagram} onChange={set('instagram')} placeholder="@solaevents" />}
              </Field>
            </div>
            <Field label="What kind of events do you run?">
              {(p) => <Input {...p} value={form.about} onChange={set('about')} placeholder="Owambes and pageants in Lagos" />}
            </Field>
            <div className="grid gap-5 border-t-2 border-ink pt-5 sm:grid-cols-2">
              <Field label="Bank" hint={banks.error ? 'Could not load banks. Refresh to try again.' : undefined}>
                {(p) => (
                  <Select {...p} value={form.bank_code} onChange={set('bank_code')}>
                    <option value="">{banks.isLoading ? 'Loading…' : 'Choose your bank'}</option>
                    {banks.data?.map((b) => (
                      <option key={b.code + b.name} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Account number">
                {(p) => <Input {...p} inputMode="numeric" maxLength={10} value={form.account_number} onChange={set('account_number')} placeholder="10 digits" />}
              </Field>
            </div>
            {error && (
              <p role="alert" className="rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
                {error}
              </p>
            )}
            <Button type="submit" variant="danfo" size="lg" disabled={busy}>
              {busy ? 'Checking your account…' : 'Apply to sell'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
