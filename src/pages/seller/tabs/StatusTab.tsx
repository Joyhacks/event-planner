import { useState } from 'react'
import { Button, ConfirmButton, Field, Input } from '../../../components/ui'
import { errorMessage, supabase } from '../../../lib/supabase'
import { fromLocalInput } from '../../../lib/when'
import type { TabProps } from '../SellerEvent'
import { ErrorNote, Panel } from './shared'

export function StatusTab({ event, refresh }: TabProps) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const closed = event.status === 'cancelled' || event.status === 'ended'

  const postpone = async () => {
    setError('')
    const { error: err } = await supabase.rpc('postpone_event', { p_event: event.id, p_new_start: fromLocalInput(date), p_note: note })
    if (err) return setError(await errorMessage(err))
    setDone('Event postponed. Ticket holders keep their tickets and can ask for a refund from their account.')
    await refresh()
  }
  const cancel = async () => {
    setError('')
    const { data, error: err } = await supabase.rpc('cancel_event', { p_event: event.id, p_reason: reason })
    if (err) return setError(await errorMessage(err))
    setDone(`Event cancelled. ${data} paid order(s) are queued for automatic refunds.`)
    await refresh()
  }

  if (closed) {
    return (
      <div className="flex flex-col gap-4">
        {done && <p className="rounded-lg border-2 border-ink bg-green px-5 py-3 font-bold text-white">{done}</p>}
        <p className="font-bold">
          This event is {event.status}. {event.status_note}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {done && <p className="rounded-lg border-2 border-ink bg-green px-5 py-3 font-bold text-white lg:col-span-2">{done}</p>}
      <div className="lg:col-span-2">
        <ErrorNote message={error} />
      </div>
      <Panel title="Postpone">
        <p className="mb-4 text-sm font-medium text-ink-soft">Tickets stay valid for the new date. Buyers who can’t make it can request a refund themselves.</p>
        <div className="flex flex-col gap-3">
          <Field label="New date and time">{(p) => <Input {...p} type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label="Message to ticket holders">{(p) => <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="The hall flooded; same venue, new date." />}</Field>
          <Button variant="ink" disabled={!date} onClick={() => void postpone()}>
            Postpone event
          </Button>
        </div>
      </Panel>
      <Panel title="Cancel">
        <p className="mb-4 text-sm font-medium text-ink-soft">Every ticket is voided and every paid order is refunded in full through Paystack. This can’t be undone.</p>
        <div className="flex flex-col gap-3">
          <Field label="Reason (shown to ticket holders)">{(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
          <ConfirmButton variant="outline" disabled={reason.trim().length < 3} confirmLabel="Cancel and refund everyone?" onConfirm={() => void cancel()}>
            Cancel event and refund
          </ConfirmButton>
        </div>
      </Panel>
    </div>
  )
}
