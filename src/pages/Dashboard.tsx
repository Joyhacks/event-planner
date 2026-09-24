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
            <Plus size={18} aria-hidden="true" /> New event
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState onSample={() => navigate(`/app/events/${loadSample()}`)} />
      ) : (
        <>
          {upcoming && <NextUp event={upcoming} />}

          <section aria-labelledby="all-events" className="mt-16">
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 id="all-events" className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                All events
              </h2>
              <span className="tabular text-sm text-ink-faint">{events.length}</span>
            </div>
            <div className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
              {sorted.map((e) => (
                <EventTicket key={e.id} event={e} />
              ))}
              <Link
                to="/app/events/new"
                className="grid min-h-[20rem] place-items-center rounded-sm border-2 border-dashed border-line-strong text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                <span className="flex flex-col items-center gap-3">
                  <Plus size={28} strokeWidth={1.5} aria-hidden="true" />
                  <span className="font-serif text-2xl italic">Plan another one</span>
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
    <section aria-labelledby="next-up" className="mt-10 grid overflow-hidden rounded-sm border border-line bg-card lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="relative overflow-hidden p-7 sm:p-9" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.4} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${meta.bg} 25%, transparent 75%)` }} />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-80">Next up · {meta.label}</p>
          <p className="tabular mt-6 font-serif text-[7.5rem] leading-[0.75] sm:text-[9rem]">{days}</p>
          <p className="mt-3 text-lg">{days === 1 ? 'day to go' : days === 0 ? 'It’s today. Enjoy it!' : 'days to go'}</p>
        </div>
      </div>
      <div className="flex flex-col p-7 sm:p-9">
        <h2 id="next-up" className="font-serif text-4xl leading-tight sm:text-5xl">
          {event.title}
        </h2>
        <p className="mt-2 text-ink-soft">
          {formatDate(event.date)} · {formatTime(event.startTime)}
          <br />
          {event.venue ? `${event.venue}, ` : ''}
          {event.city}
        </p>
        <dl className="mt-8 grid gap-6 sm:grid-cols-3">
          <div>
            <dt className="text-xs tracking-wider text-ink-faint uppercase">Guests coming</dt>
            <dd className="tabular mt-1 text-2xl font-medium">
              {g.coming} <span className="text-base text-ink-faint">of {event.guestTarget || g.heads}</span>
            </dd>
            <div className="mt-2">
              <Meter value={g.coming} max={event.guestTarget || g.heads} tone="palm" label="Guests confirmed" />
            </div>
          </div>
          <div>
            <dt className="text-xs tracking-wider text-ink-faint uppercase">Paid so far</dt>
            <dd className="tabular mt-1 text-2xl font-medium">{formatMoney(b.paid, event.currency)}</dd>
            <div className="mt-2">
              <Meter value={b.paid} max={event.budget} tone="indigo" label="Budget paid" />
            </div>
          </div>
          <div>
            <dt className="text-xs tracking-wider text-ink-faint uppercase">Aso-ebi sets</dt>
            <dd className="tabular mt-1 text-2xl font-medium">{a.sets}</dd>
            <div className="mt-2">
              <Meter value={a.received} max={a.expected} tone="ochre" label="Aso-ebi paid" />
            </div>
          </div>
        </dl>
        <Link to={`/app/events/${event.id}`} className={buttonClass('outline', 'md', 'mt-9 self-start')}>
          Open plan <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}

function EmptyState({ onSample }: { onSample: () => void }) {
  return (
    <section className="relative mt-10 overflow-hidden rounded-sm bg-indigo px-7 py-16 text-paper sm:px-12 sm:py-20">
      <Motif kind="oniko" color="#d99a2b" opacity={0.22} />
      <div className="relative max-w-xl">
        <h2 className="font-serif text-5xl leading-none sm:text-6xl">
          Nothing on the calendar <em className="text-ochre">yet.</em>
        </h2>
        <p className="mt-5 text-paper/80">
          Start with the date and roughly how many people. You can fill in the rest as the family meetings happen.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/app/events/new" className={buttonClass('paper')}>
            Plan my first event
          </Link>
          <Button variant="ghost" className="!text-paper hover:!bg-paper/10" onClick={onSample}>
            Load a sample wedding
          </Button>
        </div>
      </div>
    </section>
  )
}
