import { ArrowUpRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { EventTicket } from '../components/EventTicket'
import { Motif } from '../components/Motif'
import { PageHeader } from '../components/PageHeader'
import { Button, Meter } from '../components/ui'
import { buttonClass } from '../components/styles'
import { EVENT_TYPES } from '../data/catalog'
import type { PlannerEvent } from '../data/types'
import { daysUntil, formatDate, formatTime } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { asoebiStats, budgetStats, guestStats, nextEvent } from '../lib/stats'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { usePlanner } from '../store/planner'

function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'Ẹ káàárọ̀ · Good morning'
  if (h < 17) return 'Ẹ káàsán · Good afternoon'
  return 'Ẹ kúùrọ̀lẹ́ · Good evening'
}

export default function Dashboard() {
  useDocumentTitle('My events')
  const events = usePlanner((s) => s.events)
  const loadSample = usePlanner((s) => s.loadSample)
  const navigate = useNavigate()

  const upcoming = nextEvent(events)
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-8 sm:px-8 lg:pt-12">
      <PageHeader
        eyebrow={greeting()}
        title="Your celebrations"
        actions={
          <Link to="/app/events/new" className={buttonClass('ink')}>
            <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> New event
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState onSample={() => navigate(`/app/events/${loadSample()}`)} />
      ) : (
        <>
          {upcoming && <NextUp event={upcoming} />}

          <section aria-labelledby="all-events" className="mt-16">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <h2 id="all-events" className="text-sm font-extrabold tracking-[0.14em] uppercase">
                All events
              </h2>
              <span className="tabular font-sign text-sm">{events.length}</span>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((e) => (
                <EventTicket key={e.id} event={e} />
              ))}
              <Link
                to="/app/events/new"
                className="grid min-h-[22rem] place-items-center rounded-lg border-2 border-dashed border-ink text-ink transition-colors hover:bg-danfo"
              >
                <span className="flex flex-col items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-white">
                    <Plus size={26} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="font-display text-lg">Plan another one</span>
                </span>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function NextUp({ event }: { event: PlannerEvent }) {
  const meta = EVENT_TYPES[event.type]
  const days = daysUntil(event.date)
  const g = guestStats(event.guests)
  const b = budgetStats(event.budgetItems, event.budget)
  const a = asoebiStats(event.asoebi)

  return (
    <section
      aria-labelledby="next-up"
      className="mt-10 grid overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <div className="relative overflow-hidden border-b-2 border-ink p-7 sm:p-9 lg:border-r-2 lg:border-b-0" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.12} />
        <div className="relative">
          <p className="inline-flex rounded-full border-2 border-ink bg-white px-3 py-1 text-[0.7rem] font-extrabold tracking-[0.12em] text-ink uppercase">
            Next up · {meta.short}
          </p>
          <p className="tabular font-sign mt-8 text-[7.5rem] leading-[0.8] sm:text-[9.5rem]">{days}</p>
          <p className="mt-4 text-sm font-extrabold tracking-[0.14em] uppercase">
            {days === 1 ? 'Day to go' : days === 0 ? 'It’s today. Enjoy!' : 'Days to go'}
          </p>
        </div>
      </div>
      <div className="flex flex-col p-7 sm:p-9">
        <h2 id="next-up" className="font-display text-3xl leading-tight sm:text-4xl">
          {event.title}
        </h2>
        <p className="mt-2 font-medium text-ink-soft">
          {formatDate(event.date)} · {formatTime(event.startTime)}
          <br />
          {event.venue ? `${event.venue}, ` : ''}
          {event.city}
        </p>
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-[0.7rem] font-bold tracking-[0.12em] text-ink-faint uppercase">Guests coming</dt>
            <dd className="tabular mt-1 text-2xl font-extrabold">
              {g.coming} <span className="text-base font-semibold text-ink-faint">/ {event.guestTarget || g.heads}</span>
            </dd>
            <div className="mt-2">
              <Meter value={g.coming} max={event.guestTarget || g.heads} tone="green" label="Guests confirmed" />
            </div>
          </div>
          <div>
            <dt className="text-[0.7rem] font-bold tracking-[0.12em] text-ink-faint uppercase">Paid so far</dt>
            <dd className="tabular mt-1 text-2xl font-extrabold">{formatMoney(b.paid, event.currency)}</dd>
            <div className="mt-2">
              <Meter value={b.paid} max={event.budget} tone="blue" label="Budget paid" />
            </div>
          </div>
          <div>
            <dt className="text-[0.7rem] font-bold tracking-[0.12em] text-ink-faint uppercase">Aso-ebi sets</dt>
            <dd className="tabular mt-1 text-2xl font-extrabold">{a.sets}</dd>
            <div className="mt-2">
              <Meter value={a.received} max={a.expected} tone="pink" label="Aso-ebi paid" />
            </div>
          </div>
        </dl>
        <Link to={`/app/events/${event.id}`} className={buttonClass('danfo', 'md', 'mt-9 self-start')}>
          Open plan <ArrowUpRight size={17} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function EmptyState({ onSample }: { onSample: () => void }) {
  return (
    <section className="grain relative mt-10 overflow-hidden rounded-lg border-2 border-ink bg-danfo px-7 py-14 shadow-hard sm:px-12 sm:py-20">
      <div className="relative max-w-xl">
        <h2 className="font-display text-4xl leading-[0.95] uppercase sm:text-6xl">Nothing on the calendar yet.</h2>
        <p className="mt-5 text-lg font-medium">
          Start with the date and roughly how many people. Fill in the rest as the family meetings happen.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/app/events/new" className={buttonClass('ink')}>
            Plan my first event
          </Link>
          <Button variant="white" onClick={onSample}>
            Load a sample wedding
          </Button>
        </div>
      </div>
    </section>
  )
}
