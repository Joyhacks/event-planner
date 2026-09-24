import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { RequireAuth } from '../../components/RequireAuth'
import { Button, ConfirmButton, Field, Input, Pill } from '../../components/ui'
import { naira } from '../../lib/money'
import { errorMessage, supabase, unwrap } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { Empty, ErrorNote, Panel } from '../seller/tabs/shared'

interface Application {
  id: string
  business_name: string
  phone: string
  instagram: string
  about: string
  bank_name: string
  account_number: string
  account_name: string
  status: string
  created_at: string
  user_id: string
}
interface Settings {
  commission_bps: number
  commission_flat_kobo: number
  paystack_fee_bps: number
  paystack_fee_flat_kobo: number
  paystack_flat_waiver_kobo: number
  paystack_fee_cap_kobo: number
  order_hold_minutes: number
}
interface Flag {
  id: string
  reason: string
  details: Record<string, unknown>
  status: string
  created_at: string
  orders: { reference: string; buyer_email: string; total_kobo: number } | null
}
interface RefundRow {
  id: string
  amount_kobo: number
  status: string
  reason: string
  last_error: string | null
  created_at: string
  orders: { reference: string; buyer_email: string } | null
}
interface SellerRow {
  user_id: string
  display_name: string
  slug: string
  suspended: boolean
}

export default function Admin() {
  return (
    <RequireAuth role="super_admin">
      <Console />
    </RequireAuth>
  )
}

function Console() {
  useDocumentTitle('Admin')
  const [error, setError] = useState('')
  const [note, setNote] = useState<Record<string, string>>({})

  const apps = useQuery({
    queryKey: ['admin-apps'],
    queryFn: async () => (await unwrap(await supabase.from('seller_applications').select('*').eq('status', 'pending').order('created_at'))) as Application[],
  })
  const settings = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await unwrap(await supabase.from('platform_settings').select('*').single())) as Settings,
  })
  const flags = useQuery({
    queryKey: ['admin-flags'],
    queryFn: async () =>
      (await unwrap(await supabase.from('flagged_transactions').select('*, orders(reference, buyer_email, total_kobo)').eq('status', 'open').order('created_at', { ascending: false }))) as unknown as Flag[],
  })
  const refunds = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () =>
      (await unwrap(await supabase.from('refunds').select('*, orders(reference, buyer_email)').neq('status', 'processed').order('created_at'))) as unknown as RefundRow[],
  })
  const sellers = useQuery({
    queryKey: ['admin-sellers'],
    queryFn: async () => (await unwrap(await supabase.from('sellers').select('user_id, display_name, slug, suspended').order('created_at', { ascending: false }).limit(100))) as SellerRow[],
  })

  const approve = async (id: string) => {
    setError('')
    const { error: err } = await supabase.functions.invoke('approve-seller', { body: { application_id: id } })
    if (err) return setError(await errorMessage(err))
    await Promise.all([apps.refetch(), sellers.refetch()])
  }
  const reject = async (id: string) => {
    setError('')
    const { error: err } = await supabase.rpc('reject_seller_application', { p_application: id, p_note: note[id] ?? '' })
    if (err) return setError(await errorMessage(err))
    await apps.refetch()
  }
  const runRefunds = async () => {
    setError('')
    const { error: err } = await supabase.functions.invoke('process-refunds', { body: {} })
    if (err) return setError(await errorMessage(err))
    await refunds.refetch()
  }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 pb-24 sm:px-8">
      <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">Admin</h1>
      <div className="mt-4">
        <ErrorNote message={error} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title={`Seller applications (${apps.data?.length ?? 0})`}>
          {!apps.data?.length ? (
            <Empty>No applications waiting.</Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {apps.data.map((a) => (
                <li key={a.id} className="rounded-md border-2 border-ink p-4">
                  <p className="font-display text-lg">{a.business_name}</p>
                  <p className="text-sm font-medium text-ink-soft">
                    {a.phone} {a.instagram && `· ${a.instagram}`} · applied {new Date(a.created_at).toLocaleDateString('en-NG')}
                  </p>
                  {a.about && <p className="mt-1 text-sm">{a.about}</p>}
                  <p className="mt-2 rounded-md bg-danfo-soft px-3 py-2 text-sm font-bold">
                    Paystack verified: {a.account_name} · {a.bank_name} ···{a.account_number.slice(-4)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <Button variant="ink" size="sm" onClick={() => void approve(a.id)}>
                      Approve
                    </Button>
                    <Input aria-label="Reason for rejecting" placeholder="Reason (if rejecting)" className="h-9 max-w-56" value={note[a.id] ?? ''} onChange={(e) => setNote({ ...note, [a.id]: e.target.value })} />
                    <ConfirmButton variant="ghost" size="sm" onConfirm={() => void reject(a.id)}>
                      Reject
                    </ConfirmButton>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {settings.data && <SettingsPanel initial={settings.data} onSaved={() => void settings.refetch()} />}

        <Panel title={`Flagged payments (${flags.data?.length ?? 0})`}>
          {!flags.data?.length ? (
            <Empty>Nothing flagged. Underpayments and oversold orders show up here.</Empty>
          ) : (
            <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
              {flags.data.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-bold">
                      <Pill tone="red">{f.reason.replaceAll('_', ' ')}</Pill> {f.orders?.reference}
                    </p>
                    <p className="text-ink-soft">
                      {f.orders?.buyer_email} · expected {naira(f.orders?.total_kobo ?? 0)} · {JSON.stringify(f.details)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await supabase.rpc('resolve_flag', { p_flag: f.id })
                      await flags.refetch()
                    }}
                  >
                    Resolved
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Refunds in progress (${refunds.data?.length ?? 0})`}>
          <Button variant="danfo" size="sm" onClick={() => void runRefunds()} disabled={!refunds.data?.some((r) => r.status === 'pending' || r.status === 'failed')}>
            Send pending refunds to Paystack
          </Button>
          <ul className="mt-4 divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {!refunds.data?.length && <li className="px-4 py-6 text-center text-sm text-ink-soft">No refunds waiting.</li>}
            {refunds.data?.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <p className="font-bold">
                  {r.orders?.reference} · {naira(r.amount_kobo)} <Pill tone={r.status === 'failed' ? 'red' : 'blue'}>{r.status}</Pill>
                </p>
                <p className="text-ink-soft">
                  {r.orders?.buyer_email} · {r.reason}
                  {r.last_error && ` · ${r.last_error}`}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sellers">
          <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {!sellers.data?.length && <li className="px-4 py-6 text-center text-sm text-ink-soft">No sellers yet.</li>}
            {sellers.data?.map((s) => (
              <li key={s.user_id} className="flex items-center justify-between px-4 py-3">
                <span className="font-bold">
                  {s.display_name} {s.suspended && <Pill tone="red">Suspended</Pill>}
                </span>
                <ConfirmButton
                  variant="ghost"
                  size="sm"
                  confirmLabel={s.suspended ? 'Reinstate?' : 'Suspend seller?'}
                  onConfirm={async () => {
                    await supabase.from('sellers').update({ suspended: !s.suspended }).eq('user_id', s.user_id)
                    await sellers.refetch()
                  }}
                >
                  {s.suspended ? 'Reinstate' : 'Suspend'}
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function SettingsPanel({ initial, onSaved }: { initial: Settings; onSaved: () => void }) {
  const [s, setS] = useState({
    commission: String(initial.commission_bps / 100),
    flat: String(initial.commission_flat_kobo / 100),
    feePct: String(initial.paystack_fee_bps / 100),
    feeFlat: String(initial.paystack_fee_flat_kobo / 100),
    waiver: String(initial.paystack_flat_waiver_kobo / 100),
    cap: String(initial.paystack_fee_cap_kobo / 100),
    hold: String(initial.order_hold_minutes),
  })
  const [msg, setMsg] = useState('')
  const save = async () => {
    setMsg('')
    const { error } = await supabase
      .from('platform_settings')
      .update({
        commission_bps: Math.round(Number(s.commission) * 100),
        commission_flat_kobo: Math.round(Number(s.flat) * 100),
        paystack_fee_bps: Math.round(Number(s.feePct) * 100),
        paystack_fee_flat_kobo: Math.round(Number(s.feeFlat) * 100),
        paystack_flat_waiver_kobo: Math.round(Number(s.waiver) * 100),
        paystack_fee_cap_kobo: Math.round(Number(s.cap) * 100),
        order_hold_minutes: Number(s.hold),
        updated_at: new Date().toISOString(),
      })
      .eq('id', true)
    setMsg(error ? await errorMessage(error) : 'Saved. New orders use these numbers.')
    onSaved()
  }
  const input = (k: keyof typeof s, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      {(p) => <Input {...p} inputMode="decimal" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} />}
    </Field>
  )
  return (
    <Panel title="Commission & fees" tone="soft">
      <div className="grid gap-3 sm:grid-cols-2">
        {input('commission', 'Commission %')}
        {input('flat', 'Flat commission per order (₦)')}
        {input('feePct', 'Paystack fee %', 'Check paystack.com/pricing')}
        {input('feeFlat', 'Paystack flat fee (₦)')}
        {input('waiver', 'Flat fee waived below (₦)')}
        {input('cap', 'Paystack fee cap (₦)')}
        {input('hold', 'Checkout hold (minutes)')}
      </div>
      {msg && <p className="mt-3 text-sm font-bold">{msg}</p>}
      <Button variant="ink" className="mt-4" onClick={() => void save()}>
        Save settings
      </Button>
    </Panel>
  )
}
