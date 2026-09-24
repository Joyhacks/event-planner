import { ArrowLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { Motif } from '../../components/Motif'
import { buttonClass } from '../../components/styles'
import { EVENT_TYPES } from '../../data/catalog'
import { countdownLabel, daysUntil, formatDate, formatTime } from '../../lib/dates'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useEvent } from '../../store/planner'

export default function EventLayout() {
  const { eventId } = useParams()
  const event = useEvent(eventId)
  useDocumentTitle(event?.title ?? 'Event not found')

  if (!event) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 sm:px-8">
        <p className="font-serif text-6xl text-clay italic">Hmm.</p>
        <h1 className="mt-3 text-2xl font-semibold">We can’t find that event.</h1>
        <p className="mt-2 text-ink-soft">
          It may have been deleted, or it was planned on another device. Events are saved in this browser only.
        </p>
        <Link to="/app" className={buttonClass('ink', 'md', 'mt-8')}>
          Back to my events
        </Link>
      </div>
    )
  }

  const meta = EVENT_TYPES[event.type]
  const days = daysUntil(event.date)
  const tabs = [
    { to: '', label: 'Overview' },
    { to: 'guests', label: 'Guests', count: event.guests.length },
    { to: 'budget', label: 'Budget' },
    { to: 'vendors', label: 'Vendors', count: event.vendors.length },
    { to: 'schedule', label: 'Order of events' },
    { to: 'asoebi', label: 'Aso-ebi' },
  ]

  return (
    <div>
      <header className="relative overflow-hidden" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.35} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${meta.bg} 30%, transparent 90%)` }} />
        <div className="relative mx-auto max-w-[1180px] px-5 pt-6 pb-8 sm:px-8 lg:pt-10">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-sm opacity-80 hover:opacity-100">
            <ArrowLeft size={16} aria-hidden="true" /> All events
          </Link>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-80">
                {meta.label}
                {event.isSample && <span className="ml-3 rounded-full border border-current px-2 py-0.5 tracking-normal normal-case">Sample</span>}
              </p>
              <h1 className="mt-3 font-serif text-5xl leading-[0.95] break-words sm:text-7xl">{event.title}</h1>
              <p className="mt-3 opacity-85">
                {formatDate(event.date)} · {formatTime(event.startTime)} · {event.venue ? `${event.venue}, ` : ''}
                {event.city}
              </p>
            </div>
            <p className="shrink-0 font-serif text-3xl italic md:text-right">{countdownLabel(days)}</p>
          </div>
        </div>
      </header>

      <nav aria-label="Event sections" className="sticky top-16 z-20 border-b border-line bg-paper/95 backdrop-blur lg:top-0">
        <div className="mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-3 [scrollbar-width:none] sm:px-6">
          {tabs.map((t) => (
            <NavLink
              key={t.label}
              to={t.to}
              end
              className={({ isActive }) =>
                `relative flex h-13 shrink-0 items-center gap-2 px-3 text-sm whitespace-nowrap transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 ${
                  isActive ? 'font-semibold text-ink after:bg-clay' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {t.label}
              {t.count ? <span className="tabular rounded-full bg-paper-2 px-1.5 text-xs text-ink-soft">{t.count}</span> : null}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-[1180px] px-5 pt-10 sm:px-8">
        <Outlet context={{ event }} />
      </div>
    </div>
  )
}
