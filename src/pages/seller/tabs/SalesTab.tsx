import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { QrCode } from '../../../components/QrCode'
import { Button, ConfirmButton, Pill } from '../../../components/ui'
import { downloadFile, toCsv } from '../../../lib/csv'
import { naira } from '../../../lib/money'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

interface Sales {
  orders: number
  gross_kobo: number
  buyer_fees_kobo: number
  commission_kobo: number
  seller_net_kobo: number
  refunded_kobo: number
  tickets_issued: number
  checked_in: number
  promoters: { name: string; code: string; orders: number; owed_kobo: number }[]
}

interface OrderRow {
  id: string
  reference: string
  kind: string
  status: string
  total_kobo: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  answers: Record<string, string>
  created_at: string
  tickets: { code: string; holder_name: string; status: string; ticket_types: { name: string } | null }[]
}

export function SalesTab({ event }: TabProps) {
  const sales = useQuery({
    queryKey: ['sales', event.id],
    queryFn: async () => (await unwrap(await supabase.rpc('event_sales', { p_event: event.id }))) as Sales,
  })
  const orders = useQuery({
    queryKey: ['seller-orders', event.id],
    queryFn: async () =>
      (await unwrap(
        await supabase
          .from('orders')
          .select('id, reference, kind, status, total_kobo, buyer_name, buyer_email, buyer_phone, answers, created_at, tickets(code, holder_name, status, ticket_types(name))')
          .eq('event_id', event.id)
          .not('status', 'in', '(pending,expired)')
          .order('created_at', { ascending: false }),
      )) as unknown as OrderRow[],
  })
  const [error, setError] = useState('')
  const [qr, setQr] = useState<string | null>(null)

  const exportAttendees = () => {
    const fields = event.form_fields.map((f) => f.label)
    const rows: (string | number)[][] = [['Name on ticket', 'Ticket', 'Status', 'Buyer', 'Email', 'Phone', 'Order', ...fields]]
    for (const o of orders.data ?? []) {
      for (const t of o.tickets) {
        rows.push([t.holder_name, t.ticket_types?.name ?? '', t.status, o.buyer_name, o.buyer_email, o.buyer_phone, o.reference, ...event.form_fields.map((f) => o.answers?.[f.id] ?? '')])
      }
    }
    downloadFile(`${event.slug}-attendees.csv`, toCsv(rows))
  }

  const refund = async (id: string) => {
    setError('')
    const { error: err } = await supabase.rpc('seller_refund_order', { p_order: id, p_reason: 'Refunded by organiser' })
    if (err) return setError(await errorMessage(err))
    await Promise.all([orders.refetch(), sales.refetch()])
  }

  const s = sales.data
  return (
    <div className="flex flex-col gap-6">
      {s && (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Paid orders', String(s.orders)],
            ['Your share (est.)', naira(s.seller_net_kobo)],
            ['Ticket sales', naira(s.gross_kobo - s.buyer_fees_kobo)],
            ['Checked in', `${s.checked_in} / ${s.tickets_issued}`],
          ].map(([k, v]) => (
            <div key={k} className="flex flex-col-reverse rounded-lg border-2 border-ink bg-card p-4 shadow-hard-sm">
              <dd className="font-sign mt-1 text-xl sm:text-2xl">{v}</dd>
              <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-faint uppercase">{k}</dt>
            </div>
          ))}
        </dl>
      )}
      {s && (
        <p className="text-sm font-medium text-ink-soft">
          Paystack settles your share straight to your bank account. Commission so far: {naira(s.commission_kobo)}. Refunded: {naira(s.refunded_kobo)}.
        </p>
      )}

      {s && s.promoters.length > 0 && (
        <Panel title="Promoters">
          <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {s.promoters.map((p) => (
              <li key={p.code} className="flex justify-between px-4 py-3 font-medium">
                <span>
                  {p.name} · {p.orders} {p.orders === 1 ? 'order' : 'orders'}
                </span>
                <span className="font-bold">You owe {naira(p.owed_kobo)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel title="Orders">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportAttendees} disabled={!orders.data?.length}>
            <Download size={15} aria-hidden="true" /> Attendee list (CSV)
          </Button>
        </div>
        <ErrorNote message={error} />
        {!orders.data?.length ? (
          <Empty>No orders yet.</Empty>
        ) : (
          <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {orders.data.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {o.buyer_name} {o.kind === 'comp' && <Pill tone="blue">Comp</Pill>} {o.kind === 'votes' && <Pill tone="pink">Votes</Pill>}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {o.reference} · {o.buyer_email} · {new Date(o.created_at).toLocaleString('en-NG')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-sign">{naira(o.total_kobo)}</span>
                    <Pill tone={o.status === 'paid' ? 'green' : o.status === 'flagged' ? 'red' : 'neutral'}>{o.status.replace('_', ' ')}</Pill>
                    {o.status === 'paid' && o.total_kobo > 0 && (
                      <ConfirmButton variant="ghost" size="sm" confirmLabel="Refund in full?" onConfirm={() => void refund(o.id)}>
                        Refund
                      </ConfirmButton>
                    )}
                  </div>
                </div>
                {o.kind === 'comp' && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.tickets.map((t) => (
                      <Button key={t.code} variant="outline" size="sm" onClick={() => setQr(t.code)}>
                        Show QR · {t.code.slice(0, 6).toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {qr && (
        <div role="dialog" aria-modal="true" aria-label="Ticket QR code" className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-5" onClick={() => setQr(null)}>
          <div className="rounded-lg border-2 border-ink bg-card p-6 text-center shadow-hard-lg" onClick={(e) => e.stopPropagation()}>
            <QrCode value={qr} size={260} label="Complimentary ticket QR code" />
            <p className="mt-3 text-sm font-medium">Screenshot this and send it to your guest.</p>
            <Button variant="ink" className="mt-4" onClick={() => setQr(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
