import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button, Field, Input } from '../../../components/ui'
import { FABRIC_SWATCHES } from '../../../data/catalog'
import { naira, nairaInputToKobo } from '../../../lib/money'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import type { AsoebiItem } from '../../../lib/types'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

interface Sold {
  id: string
  quantity: number
  collected: boolean
  asoebi_items: { name: string } | null
  orders: { buyer_name: string; buyer_phone: string; reference: string; status: string } | null
}

export function AsoebiTab({ event }: TabProps) {
  const items = useQuery({
    queryKey: ['seller-asoebi', event.id],
    queryFn: async () => (await unwrap(await supabase.from('asoebi_items').select('*').eq('event_id', event.id).order('created_at'))) as AsoebiItem[],
  })
  const sold = useQuery({
    queryKey: ['seller-asoebi-orders', event.id],
    queryFn: async () =>
      ((await unwrap(
        await supabase
          .from('order_items')
          .select('id, quantity, collected, asoebi_items!inner(name, event_id), orders!inner(buyer_name, buyer_phone, reference, status)')
          .eq('asoebi_items.event_id', event.id)
          .eq('orders.status', 'paid'),
      )) ?? []) as unknown as Sold[],
  })
  const [f, setF] = useState({ name: '', price: '', stock: '', colors: [] as string[] })
  const [error, setError] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const price = nairaInputToKobo(f.price)
    if (!f.name.trim()) return setError('Describe the fabric, e.g. “Gold aso-oke set”.')
    if (!price || Number.isNaN(price)) return setError('Enter the price per set.')
    const { error: err } = await supabase.from('asoebi_items').insert({
      event_id: event.id,
      name: f.name.trim(),
      price_kobo: price,
      stock: Number(f.stock) || 0,
      colors: f.colors,
    })
    if (err) return setError(await errorMessage(err))
    setF({ name: '', price: '', stock: '', colors: [] })
    await items.refetch()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <Panel title="Aso-ebi for sale">
          {!items.data?.length ? (
            <Empty>Sell the family fabric at checkout. Money goes to your account like ticket sales.</Empty>
          ) : (
            <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
              {items.data.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex -space-x-2" aria-hidden="true">
                      {(a.colors.length ? a.colors : ['#d9d6cb']).map((c) => (
                        <span key={c} className="h-7 w-7 rounded-full border-2 border-ink" style={{ background: c }} />
                      ))}
                    </span>
                    <div>
                      <p className="font-bold">{a.name}</p>
                      <p className="text-sm text-ink-soft">
                        {naira(a.price_kobo)} · {a.sold} sold of {a.stock}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={a.active ? 'ghost' : 'outline'}
                    size="sm"
                    onClick={async () => {
                      await supabase.from('asoebi_items').update({ active: !a.active }).eq('id', a.id)
                      await items.refetch()
                    }}
                  >
                    {a.active ? 'Stop selling' : 'Sell again'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Collection list">
          {!sold.data?.length ? (
            <Empty>Paid aso-ebi orders appear here. Tick them off as people collect.</Empty>
          ) : (
            <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
              {sold.data.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-bold">{s.orders?.buyer_name}</p>
                    <p className="text-sm text-ink-soft">
                      {s.quantity} × {s.asoebi_items?.name} · {s.orders?.reference} {s.orders?.buyer_phone && `· ${s.orders.buyer_phone}`}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={s.collected}
                      onChange={async (e) => {
                        await supabase.from('order_items').update({ collected: e.target.checked }).eq('id', s.id)
                        await sold.refetch()
                      }}
                    />
                    Collected
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      <form onSubmit={add} noValidate className="lg:col-span-5">
        <Panel title="Add aso-ebi" tone="soft">
          <div className="flex flex-col gap-4">
            <Field label="Fabric">
              {(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Gold aso-oke set with gele" />}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price per set (₦)">
                {(p) => <Input {...p} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="45,000" />}
              </Field>
              <Field label="Sets available">
                {(p) => <Input {...p} inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} placeholder="100" />}
              </Field>
            </div>
            <fieldset>
              <legend className="text-[0.72rem] font-bold tracking-[0.12em] uppercase">Colours (up to 3)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FABRIC_SWATCHES.map((s) => {
                  const on = f.colors.includes(s.hex)
                  return (
                    <button
                      key={s.hex}
                      type="button"
                      aria-pressed={on}
                      aria-label={s.name}
                      title={s.name}
                      onClick={() => setF((x) => ({ ...x, colors: on ? x.colors.filter((c) => c !== s.hex) : x.colors.length < 3 ? [...x.colors, s.hex] : x.colors }))}
                      className={`h-10 w-10 rounded-full border-2 border-ink ${on ? 'shadow-hard-sm ring-2 ring-ink ring-offset-2' : ''}`}
                      style={{ background: s.hex }}
                    />
                  )
                })}
              </div>
            </fieldset>
            <ErrorNote message={error} />
            <Button type="submit" variant="ink">
              Add aso-ebi
            </Button>
          </div>
        </Panel>
      </form>
    </div>
  )
}
