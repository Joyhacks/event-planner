import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input, Pill, Select } from '../../../components/ui'
import { naira, nairaInputToKobo } from '../../../lib/money'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import type { TicketType } from '../../../lib/types'
import { formatWhen, fromLocalInput } from '../../../lib/when'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

const blank = { name: '', kind: 'single', seats: '10', price: '', quantity: '', sale_starts_at: '', sale_ends_at: '', max_per_order: '10', hidden: false, description: '' }

export function TicketsTab({ event }: TabProps) {
  const types = useQuery({
    queryKey: ['seller-ticket-types', event.id],
    queryFn: async () => (await unwrap(await supabase.from('ticket_types').select('*').eq('event_id', event.id).order('sort').order('created_at'))) as TicketType[],
  })
  const [f, setF] = useState(blank)
  const [error, setError] = useState('')
  const [comp, setComp] = useState({ type: '', holder: '', email: '', count: '1' })
  const [compMsg, setCompMsg] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const price = f.price.trim() === '' || f.price.trim() === '0' ? 0 : nairaInputToKobo(f.price)
    const quantity = Number(f.quantity)
    if (!f.name.trim()) return setError('Name the ticket, e.g. Regular, VIP, Gold table.')
    if (Number.isNaN(price)) return setError('Price must be a number, e.g. 15,000 or 15k.')
    if (!Number.isInteger(quantity) || quantity < 1) return setError('How many are for sale?')
    const { error: err } = await supabase.from('ticket_types').insert({
      event_id: event.id,
      name: f.name.trim(),
      description: f.description.trim(),
      kind: f.kind,
      seats: f.kind === 'table' ? Number(f.seats) : 1,
      price_kobo: f.hidden ? 0 : price,
      quantity,
      sale_starts_at: fromLocalInput(f.sale_starts_at),
      sale_ends_at: fromLocalInput(f.sale_ends_at),
      max_per_order: Number(f.max_per_order) || 10,
      hidden: f.hidden,
      sort: (types.data?.length ?? 0) + 1,
    })
    if (err) return setError(await errorMessage(err))
    setF(blank)
    await types.refetch()
  }

  const update = async (t: TicketType, patch: Partial<TicketType>) => {
    const { error: err } = await supabase.from('ticket_types').update(patch).eq('id', t.id)
    if (err) setError(await errorMessage(err))
    await types.refetch()
  }

  const remove = async (t: TicketType) => {
    const { error: err } = await supabase.from('ticket_types').delete().eq('id', t.id)
    if (err) setError(await errorMessage(err))
    await types.refetch()
  }

  const issueComps = async (e: FormEvent) => {
    e.preventDefault()
    setCompMsg('')
    const { error: err } = await supabase.rpc('issue_comp_tickets', {
      p_ticket_type: comp.type,
      p_holder: comp.holder,
      p_email: comp.email,
      p_count: Number(comp.count),
    })
    if (err) return setCompMsg(await errorMessage(err))
    setCompMsg(`Issued ${comp.count} ticket(s) to ${comp.holder}. They appear in your Sales tab; share the QR from there.`)
    setComp({ ...comp, holder: '', email: '' })
    await types.refetch()
  }

  const hiddenTypes = (types.data ?? []).filter((t) => t.hidden)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Panel title="Ticket types">
          {!types.data?.length ? (
            <Empty>No tickets yet. Add at least one before you publish.</Empty>
          ) : (
            <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
              {types.data.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {t.name} <span className="font-sign text-base">{t.price_kobo ? naira(t.price_kobo) : 'Free'}</span>
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {t.kind === 'table' && <Pill tone="blue">Table for {t.seats}</Pill>}
                      {t.kind === 'entry' && <Pill tone="pink">Contest entry</Pill>}
                      {t.hidden && <Pill tone="neutral">Hidden · comps</Pill>}
                      {t.sale_ends_at && <Pill tone="danfo">Until {formatWhen(t.sale_ends_at)}</Pill>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm font-bold">
                      {t.sold}/
                      <input
                        aria-label={`Quantity for ${t.name}`}
                        defaultValue={t.quantity}
                        inputMode="numeric"
                        className="w-16 rounded border-2 border-line-strong bg-white px-1"
                        onBlur={(e) => Number(e.target.value) !== t.quantity && void update(t, { quantity: Number(e.target.value) })}
                      />
                    </span>
                    {t.sold === 0 && (
                      <ConfirmButton variant="ghost" size="sm" onConfirm={() => void remove(t)}>
                        Delete
                      </ConfirmButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {hiddenTypes.length > 0 && (
          <div className="mt-6">
            <Panel title="Free VIP tickets (comps)">
              <form onSubmit={issueComps} noValidate className="grid gap-3 sm:grid-cols-2">
                <Field label="From">
                  {(p) => (
                    <Select {...p} value={comp.type} onChange={(e) => setComp({ ...comp, type: e.target.value })}>
                      <option value="">Choose a hidden type</option>
                      {hiddenTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.quantity - t.sold} left)
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="How many">
                  {(p) => <Input {...p} inputMode="numeric" value={comp.count} onChange={(e) => setComp({ ...comp, count: e.target.value })} />}
                </Field>
                <Field label="Guest name">
                  {(p) => <Input {...p} value={comp.holder} onChange={(e) => setComp({ ...comp, holder: e.target.value })} placeholder="Alhaji Musa" />}
                </Field>
                <Field label="Guest email">
                  {(p) => <Input {...p} type="email" value={comp.email} onChange={(e) => setComp({ ...comp, email: e.target.value })} />}
                </Field>
                <div className="sm:col-span-2">
                  <ErrorNote message={compMsg.startsWith('Issued') ? '' : compMsg} />
                  {compMsg.startsWith('Issued') && <p className="mb-2 text-sm font-bold text-green">{compMsg}</p>}
                  <Button type="submit" variant="ink" disabled={!comp.type || !comp.holder || !comp.email}>
                    Issue free tickets
                  </Button>
                </div>
              </form>
            </Panel>
          </div>
        )}
      </div>

      <form onSubmit={add} noValidate className="lg:col-span-5">
        <Panel title="Add a ticket type" tone="soft">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              {(p) => <Input {...p} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Regular, VIP, Gold table…" />}
            </Field>
            <Field label="Kind">
              {(p) => (
                <Select {...p} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                  <option value="single">Single ticket</option>
                  <option value="table">Table (group)</option>
                </Select>
              )}
            </Field>
            {f.kind === 'table' ? (
              <Field label="Seats per table">
                {(p) => <Input {...p} inputMode="numeric" value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} />}
              </Field>
            ) : (
              <Field label="Max per order">
                {(p) => <Input {...p} inputMode="numeric" value={f.max_per_order} onChange={(e) => setF({ ...f, max_per_order: e.target.value })} />}
              </Field>
            )}
            <Field label={f.kind === 'table' ? 'Price per table (₦)' : 'Price (₦)'} hint="0 for free RSVP">
              {(p) => <Input {...p} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="15,000" disabled={f.hidden} />}
            </Field>
            <Field label={f.kind === 'table' ? 'Tables available' : 'Tickets available'}>
              {(p) => <Input {...p} inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} placeholder="200" />}
            </Field>
            <Field label="Sale starts (optional)">
              {(p) => <Input {...p} type="datetime-local" value={f.sale_starts_at} onChange={(e) => setF({ ...f, sale_starts_at: e.target.value })} />}
            </Field>
            <Field label="Sale ends (early bird)">
              {(p) => <Input {...p} type="datetime-local" value={f.sale_ends_at} onChange={(e) => setF({ ...f, sale_ends_at: e.target.value })} />}
            </Field>
            <Field label="Short description (optional)" className="sm:col-span-2">
              {(p) => <Input {...p} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Includes small chops and a drink" />}
            </Field>
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
              <input type="checkbox" checked={f.hidden} onChange={(e) => setF({ ...f, hidden: e.target.checked })} />
              Hidden, for free VIP tickets I hand out myself
            </label>
          </div>
          <div className="mt-4">
            <ErrorNote message={error} />
            <Button type="submit" variant="ink" className="mt-2">
              Add ticket type
            </Button>
          </div>
        </Panel>
      </form>
    </div>
  )
}
