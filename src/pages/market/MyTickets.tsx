import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { QrCode } from '../../components/QrCode'
import { RequireAuth } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { buttonClass } from '../../components/styles'
import { ConfirmButton, Pill } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { naira } from '../../lib/money'
import { errorMessage, supabase, unwrap } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatWhen } from '../../lib/when'

interface TicketRow {
  id: string
  code: string
  holder_name: string
  status: 'valid' | 'checked_in' | 'void'
  order_id: string
  ticket_types: { name: string } | null
  events: { id: string; title: string; slug: string; starts_at: string; venue: string; city: string; status: string; status_note: string } | null
}

interface OrderRow {
  id: string
  reference: string
  kind: string
  status: string
  total_kobo: number
  created_at: string
  event_id: string
  events: { title: string; status: string } | null
  order_items: { item_type: string; quantity: number; asoebi_items: { name: string } | null; collected: boolean }[]
}

export default function MyTickets() {
  return (
    <RequireAuth>
      <Tickets />
    </RequireAuth>
  )
}

function Tickets() {
  useDocumentTitle('My tickets')
  const { user } = useAuth()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const [refundError, setRefundError] = useState('')

  const tickets = useQuery({
    queryKey: ['my-tickets', user?.id],
    queryFn: async () =>
      (await unwrap(
        await supabase
          .from('tickets')
          .select('id, code, holder_name, status, order_id, ticket_types(name), events(id, title, slug, starts_at, venue, city, status, status_note)')
          .order('created_at', { ascending: false }),
      )) as unknown as TicketRow[],
  })
  const orders = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () =>
      (await unwrap(
        await supabase
          .from('orders')
          .select('id, reference, kind, status, total_kobo, created_at, event_id, events(title, status), order_items(item_type, quantity, collected, asoebi_items(name))')
          .eq('buyer_id', user!.id)
          .not('status', 'in', '(pending,expired)')
          .order('created_at', { ascending: false }),
      )) as unknown as OrderRow[],
  })

  if (tickets.isLoading || orders.isLoading) return <PageLoader />

  const byEvent = new Map<string, TicketRow[]>()
  for (const t of tickets.data ?? []) {
    const key = t.events?.id ?? 'x'
    byEvent.set(key, [...(byEvent.get(key) ?? []), t])
  }

  const requestRefund = async (orderId: string) => {
    setRefundError('')
    const { error } = await supabase.rpc('request_refund', { p_order: orderId })
    if (error) return setRefundError(await errorMessage(error))
    await qc.invalidateQueries({ queryKey: ['my-orders'] })
    await qc.invalidateQueries({ queryKey: ['my-tickets'] })
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 pt-10 pb-24 sm:px-8">
      {params.get('new') && (
        <p role="status" className="mb-8 rounded-lg border-2 border-ink bg-green px-5 py-3 font-bold text-white shadow-hard">
          Done! Your tickets are below.
        </p>
      )}
      <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">My tickets</h1>
      <p className="mt-3 font-medium text-ink-soft">Show the QR code at the door. Screenshots work too, but each code only lets one person in.</p>

      {byEvent.size === 0 ? (
        <div className="mt-10 rounded-lg border-2 border-dashed border-ink px-6 py-12 text-center">
          <p className="font-medium text-ink-soft">No tickets yet.</p>
          <Link to="/events" className={buttonClass('ink', 'md', 'mt-5')}>
            Find an event
          </Link>
        </div>
      ) : (
        [...byEvent.values()].map((list) => {
          const ev = list[0]!.events!
          return (
            <section key={ev.id} className="mt-12" aria-labelledby={`ev-${ev.id}`}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
                <div>
                  <h2 id={`ev-${ev.id}`} className="font-display text-2xl">
                    <Link to={`/e/${ev.slug}`} className="hover:underline">
                      {ev.title}
                    </Link>
                  </h2>
                  <p className="text-sm font-semibold">
                    {formatWhen(ev.starts_at)} · {[ev.venue, ev.city].filter(Boolean).join(', ')}
                  </p>
                </div>
                {ev.status !== 'published' && <Pill tone={ev.status === 'cancelled' ? 'red' : 'pink'}>{ev.status}</Pill>}
              </div>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <li key={t.id} className={`rounded-lg border-2 border-ink bg-card p-5 shadow-hard ${t.status !== 'valid' ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold">{t.ticket_types?.name}</p>
                      <Pill tone={t.status === 'valid' ? 'green' : t.status === 'checked_in' ? 'blue' : 'red'}>
                        {t.status === 'valid' ? 'Valid' : t.status === 'checked_in' ? 'Used' : 'Void'}
                      </Pill>
                    </div>
                    <p className="text-sm text-ink-soft">{t.holder_name}</p>
                    <div className="mt-4 grid place-items-center">
                      {t.status === 'valid' ? (
                        <QrCode value={t.code} label={`Ticket QR code for ${t.holder_name}`} />
                      ) : (
                        <div className="grid h-[220px] w-[220px] place-items-center rounded-md border-2 border-dashed border-ink font-bold">
                          {t.status === 'void' ? 'Cancelled' : 'Already used'}
                        </div>
                      )}
                    </div>
                    <p className="tabular mt-3 text-center font-mono text-xs tracking-widest text-ink-soft">{t.code.slice(0, 8).toUpperCase()}</p>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}

      {(orders.data ?? []).length > 0 && (
        <section className="mt-16" aria-labelledby="orders">
          <h2 id="orders" className="font-display text-2xl">
            Orders
          </h2>
          {refundError && (
            <p role="alert" className="mt-3 rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
              {refundError}
            </p>
          )}
          <ul className="mt-4 divide-y-2 divide-ink overflow-hidden rounded-lg border-2 border-ink bg-card">
            {orders.data!.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-bold">{o.events?.title}</p>
                  <p className="text-sm text-ink-soft">
                    {o.reference} · {new Date(o.created_at).toLocaleDateString('en-NG')} ·{' '}
                    {o.kind === 'votes' ? 'Votes' : o.order_items.map((i) => (i.asoebi_items ? `${i.quantity} × ${i.asoebi_items.name}${i.collected ? ' (collected)' : ''}` : `${i.quantity} ticket${i.quantity > 1 ? 's' : ''}`)).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-sign">{naira(o.total_kobo)}</span>
                  <Pill tone={o.status === 'paid' ? 'green' : o.status.startsWith('refund') ? 'blue' : 'neutral'}>
                    {o.status === 'refund_pending' ? 'Refund on the way' : o.status}
                  </Pill>
                  {o.status === 'paid' && o.events?.status === 'postponed' && o.total_kobo > 0 && (
                    <ConfirmButton variant="outline" size="sm" confirmLabel="Refund this order?" onConfirm={() => void requestRefund(o.id)}>
                      Get a refund
                    </ConfirmButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
