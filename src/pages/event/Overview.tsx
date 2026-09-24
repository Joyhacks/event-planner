import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EventForm } from '../../components/EventForm'
import { Button, ConfirmButton, Eyebrow, Meter } from '../../components/ui'
import { eventToForm } from '../../lib/eventForm'
import { formatMoney } from '../../lib/money'
import { asoebiStats, budgetStats, guestStats, nextSteps } from '../../lib/stats'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function Overview() {
  const { event } = useEventContext()
  const updateEvent = usePlanner((s) => s.updateEvent)
  const deleteEvent = usePlanner((s) => s.deleteEvent)
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)

  const g = guestStats(event.guests)
  const b = budgetStats(event.budgetItems, event.budget)
  const a = asoebiStats(event.asoebi)
  const steps = nextSteps(event)
  const money = (n: number) => formatMoney(n, event.currency)

  if (editing) {
    return (
      <section aria-labelledby="edit-heading" className="max-w-3xl">
        <h2 id="edit-heading" className="font-display text-3xl">Edit details</h2>
        <div className="mt-8">
          <EventForm
            initial={eventToForm(event)}
            submitLabel="Save changes"
            allowPast
            onSubmit={(input) => {
              updateEvent(event.id, input)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </section>
    )
  }

  const cards = [
    {
      to: 'guests',
      label: 'Guests coming',
      value: `${g.coming}`,
      sub: `${g.pending} awaiting · ${g.heads} invited`,
      meter: <Meter value={g.coming} max={event.guestTarget || g.heads} tone="green" label="Guests confirmed" />,
    },
    {
      to: 'budget',
      label: 'Planned spend',
      value: money(b.planned),
      sub: b.overBudget ? `${money(-b.unallocated)} over budget` : `${money(b.unallocated)} left to allocate`,
      meter: <Meter value={b.planned} max={event.budget} tone={b.overBudget ? 'red' : 'ink'} label="Budget allocated" />,
    },
    {
      to: 'budget',
      label: 'Paid so far',
      value: money(b.paid),
      sub: `${money(b.outstanding)} still to pay`,
      meter: <Meter value={b.paid} max={b.planned} tone="ink" label="Planned spend paid" />,
    },
    {
      to: 'asoebi',
      label: 'Aso-ebi',
      value: event.asoebi ? `${a.sets} sets` : 'Not set up',
      sub: event.asoebi ? `${money(a.owing)} owed` : 'Add fabric and price',
      meter: <Meter value={a.received} max={a.expected} tone="danfo" label="Aso-ebi paid" />,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
      <section aria-label="Summary" className="lg:col-span-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group rounded-lg border-2 border-ink bg-card p-6 transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
            >
              <p className="text-[0.7rem] font-bold tracking-[0.12em] text-ink-faint uppercase">{c.label}</p>
              <p className="tabular mt-2 truncate font-sign text-2xl sm:text-3xl">{c.value}</p>
              <p className="mt-1 text-sm font-medium text-ink-soft">{c.sub}</p>
              <div className="mt-4">{c.meter}</div>
            </Link>
          ))}
        </div>

        {event.hosts && (
          <p className="mt-8 text-ink-soft">
            Hosted by <span className="text-ink">{event.hosts}</span>
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t-2 border-ink pt-6">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit details
          </Button>
          <ConfirmButton
            variant="ghost"
            confirmLabel="Delete for good?"
            onConfirm={() => {
              deleteEvent(event.id)
              navigate('/app', { replace: true })
            }}
          >
            Delete event
          </ConfirmButton>
        </div>
      </section>

      <aside aria-labelledby="steps-heading" className="lg:col-span-4">
        <Eyebrow>
          <span id="steps-heading">Next steps</span>
        </Eyebrow>
        {steps.length === 0 ? (
          <p className="mt-4 font-display text-2xl">All sorted. Go and rest small.</p>
        ) : (
          <ol className="mt-4 border-t-2 border-ink">
            {steps.map((s, i) => (
              <li key={s} className="grid grid-cols-[2.25rem_1fr] items-start gap-3 border-b-2 border-ink py-4 text-[0.95rem] font-medium">
                <span className="tabular font-sign grid h-8 w-8 place-items-center rounded-md border-2 border-ink bg-danfo text-sm">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        )}
        <Link to="/app/vendors" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold underline decoration-2 underline-offset-4 hover:decoration-pink">
          Browse vendors <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </aside>
    </div>
  )
}
