import { useQuery } from '@tanstack/react-query'
import { Copy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input, Pill, Select } from '../../../components/ui'
import { naira, nairaInputToKobo } from '../../../lib/money'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import { fromLocalInput } from '../../../lib/when'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

interface Promo {
  id: string
  code: string
  percent_off: number | null
  amount_off_kobo: number | null
  max_uses: number | null
  used: number
  expires_at: string | null
  active: boolean
}
interface Promoter {
  id: string
  name: string
  code: string
  commission_bps: number
}

export function PromosTab({ event }: TabProps) {
  const promos = useQuery({
    queryKey: ['promos', event.id],
    queryFn: async () => (await unwrap(await supabase.from('promo_codes').select('*').eq('event_id', event.id).order('created_at'))) as Promo[],
  })
  const promoters = useQuery({
    queryKey: ['promoters', event.id],
    queryFn: async () => (await unwrap(await supabase.from('promoters').select('*').eq('event_id', event.id).order('created_at'))) as Promoter[],
  })
  const [p, setP] = useState({ code: '', type: 'percent', value: '', max_uses: '', expires_at: '' })
  const [pr, setPr] = useState({ name: '', code: '', commission: '10' })
  const [error, setError] = useState('')
  const [error2, setError2] = useState('')

  const addPromo = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const code = p.code.trim().toUpperCase()
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return setError('Codes are 3–20 letters or numbers, e.g. EARLY10.')
    const value = p.type === 'percent' ? Number(p.value) : nairaInputToKobo(p.value)
    if (!value || Number.isNaN(value)) return setError('Enter the discount.')
    const { error: err } = await supabase.from('promo_codes').insert({
      event_id: event.id,
      code,
      percent_off: p.type === 'percent' ? value : null,
      amount_off_kobo: p.type === 'amount' ? value : null,
      max_uses: p.max_uses ? Number(p.max_uses) : null,
      expires_at: fromLocalInput(p.expires_at),
    })
    if (err) return setError(await errorMessage(err))
    setP({ code: '', type: 'percent', value: '', max_uses: '', expires_at: '' })
    await promos.refetch()
  }

  const addPromoter = async (e: FormEvent) => {
    e.preventDefault()
    setError2('')
    const code = (pr.code || pr.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (!pr.name.trim() || code.length < 3) return setError2('Add the promoter’s name.')
    const { error: err } = await supabase.from('promoters').insert({
      event_id: event.id,
      name: pr.name.trim(),
      code,
      commission_bps: Math.round(Number(pr.commission || 0) * 100),
    })
    if (err) return setError2(await errorMessage(err))
    setPr({ name: '', code: '', commission: '10' })
    await promoters.refetch()
  }

  const link = (code: string) => `${window.location.origin}/e/${event.slug}?ref=${code}`

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Promo codes">
        {!promos.data?.length ? (
          <Empty>No codes yet. Discounts apply to tickets, not aso-ebi.</Empty>
        ) : (
          <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {promos.data.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="font-sign">{c.code}</p>
                  <p className="text-sm text-ink-soft">
                    {c.percent_off ? `${c.percent_off}% off` : `${naira(c.amount_off_kobo ?? 0)} off`} · used {c.used}
                    {c.max_uses ? ` of ${c.max_uses}` : ''}
                  </p>
                </div>
                <Button
                  variant={c.active ? 'ghost' : 'outline'}
                  size="sm"
                  onClick={async () => {
                    await supabase.from('promo_codes').update({ active: !c.active }).eq('id', c.id)
                    await promos.refetch()
                  }}
                >
                  {c.active ? 'Pause' : 'Resume'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addPromo} noValidate className="mt-5 grid gap-3 border-t-2 border-ink pt-5 sm:grid-cols-2">
          <Field label="Code">
            {(x) => <Input {...x} value={p.code} onChange={(e) => setP({ ...p, code: e.target.value.toUpperCase() })} placeholder="EARLY10" />}
          </Field>
          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <Field label="Type">
              {(x) => (
                <Select {...x} value={p.type} onChange={(e) => setP({ ...p, type: e.target.value })}>
                  <option value="percent">% off</option>
                  <option value="amount">₦ off</option>
                </Select>
              )}
            </Field>
            <Field label="Value">
              {(x) => <Input {...x} inputMode="decimal" value={p.value} onChange={(e) => setP({ ...p, value: e.target.value })} placeholder={p.type === 'percent' ? '10' : '2,000'} />}
            </Field>
          </div>
          <Field label="Max uses (optional)">
            {(x) => <Input {...x} inputMode="numeric" value={p.max_uses} onChange={(e) => setP({ ...p, max_uses: e.target.value })} />}
          </Field>
          <Field label="Expires (optional)">
            {(x) => <Input {...x} type="datetime-local" value={p.expires_at} onChange={(e) => setP({ ...p, expires_at: e.target.value })} />}
          </Field>
          <div className="sm:col-span-2">
            <ErrorNote message={error} />
            <Button type="submit" variant="ink" className="mt-2">
              Add code
            </Button>
          </div>
        </form>
      </Panel>

      <Panel title="Promoter links">
        <p className="mb-4 text-sm font-medium text-ink-soft">
          Give each promoter their own link. Sales through it are tracked, and the Sales tab shows what you owe them.
        </p>
        {!promoters.data?.length ? (
          <Empty>No promoters yet.</Empty>
        ) : (
          <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {promoters.data.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold">
                    {x.name} <Pill tone="danfo">{x.commission_bps / 100}%</Pill>
                  </p>
                  <p className="truncate text-sm text-ink-soft">{link(x.code)}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(link(x.code))}>
                    <Copy size={14} aria-hidden="true" /> Copy
                  </Button>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    onConfirm={async () => {
                      await supabase.from('promoters').delete().eq('id', x.id)
                      await promoters.refetch()
                    }}
                  >
                    Remove
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addPromoter} noValidate className="mt-5 grid gap-3 border-t-2 border-ink pt-5 sm:grid-cols-3">
          <Field label="Name">
            {(x) => <Input {...x} value={pr.name} onChange={(e) => setPr({ ...pr, name: e.target.value })} placeholder="Tunde Hype" />}
          </Field>
          <Field label="Link code (optional)">
            {(x) => <Input {...x} value={pr.code} onChange={(e) => setPr({ ...pr, code: e.target.value })} placeholder="tunde" />}
          </Field>
          <Field label="Commission %">
            {(x) => <Input {...x} inputMode="decimal" value={pr.commission} onChange={(e) => setPr({ ...pr, commission: e.target.value })} />}
          </Field>
          <div className="sm:col-span-3">
            <ErrorNote message={error2} />
            <Button type="submit" variant="ink" className="mt-2">
              Add promoter
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
