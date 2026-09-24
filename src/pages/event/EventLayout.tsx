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
        <p className="font-sign text-6xl text-pink">Hmm.</p>
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
      <header className="relative overflow-hidden border-b-2 border-ink" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.12} />
        <div className="relative mx-auto max-w-[1180px] px-5 pt-6 pb-9 sm:px-8 lg:pt-9">
          <Link to="/app" className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
            <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> All events
          </Link>
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border-2 border-ink bg-white px-3 py-0.5 text-[0.7rem] font-extrabold tracking-[0.12em] text-ink uppercase">
                  {meta.label}
                </span>
                {event.isSample && (
                  <span className="rounded-full border-2 border-ink bg-ink px-3 py-0.5 text-[0.7rem] font-extrabold tracking-[0.12em] text-danfo uppercase">
                    Sample
                  </span>
                )}
              </p>
              <h1 className="font-display mt-4 text-[2.6rem] leading-[0.92] break-words sm:text-6xl">{event.title}</h1>
              <p className="mt-3 font-semibold">
                {formatDate(event.date)} · {formatTime(event.startTime)} · {event.venue ? `${event.venue}, ` : ''}
                {event.city}
              </p>
            </div>
            <p className="font-sign shrink-0 self-start rounded-full border-2 border-ink bg-white px-5 py-3 text-lg text-ink shadow-hard-sm md:self-auto md:rotate-3">
              {countdownLabel(days)}
            </p>
          </div>
        </div>
      </header>

      <nav aria-label="Event sections" className="sticky top-16 z-20 border-b-2 border-ink bg-paper lg:top-0">
        <div className="mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] sm:px-6">
          {tabs.map((t) => (
            <NavLink
              key={t.label}
              to={t.to}
              end
              className={({ isActive }) =>
                `flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold whitespace-nowrap transition-colors ${
                  isActive ? 'bg-ink text-danfo' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
                }`
              }
            >
              {t.label}
              {t.count ? <span className="tabular rounded-full bg-danfo px-1.5 text-xs text-ink">{t.count}</span> : null}
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
