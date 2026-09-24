import { Link } from 'react-router-dom'
import { EVENT_TYPES } from '../data/catalog'
import type { PlannerEvent } from '../data/types'
import { daysUntil, parseLocalDate } from '../lib/dates'
import { formatMoneyCompact } from '../lib/money'
import { budgetStats, guestStats } from '../lib/stats'
import { Motif } from './Motif'

interface Props {
  event: PlannerEvent
  /** Render as a static preview (landing page), not a link. */
  preview?: boolean
  className?: string
}

export function EventTicket({ event, preview = false, className = '' }: Props) {
  const meta = EVENT_TYPES[event.type]
  const days = daysUntil(event.date)
  const date = parseLocalDate(event.date)
  const g = guestStats(event.guests)
  const b = budgetStats(event.budgetItems, event.budget)

  const body = (
    <>
      <div className="relative h-36 overflow-hidden px-5 pt-4 pb-3" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.45} />
        <div aria-hidden="true" className="absolute inset-0" style={{ background: `linear-gradient(20deg, ${meta.bg} 22%, transparent 60%)` }} />
        <div className="relative flex items-start justify-between text-[0.72rem] font-semibold tracking-[0.16em] uppercase">
          <span>{meta.short}</span>
          <time dateTime={event.date} className="text-right leading-tight">
            {date.toLocaleDateString('en-NG', { weekday: 'short' })}
            <br />
            {date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
          </time>
        </div>
        <div className="relative mt-3 flex items-end gap-2">
          <span className="tabular font-serif text-6xl leading-[0.8]">{days >= 0 ? days : '—'}</span>
          <span className="pb-1 text-sm opacity-85">
            {days > 1 ? 'days to go' : days === 1 ? 'day to go' : days === 0 ? 'today!' : 'done & dusted'}
          </span>
        </div>
      </div>
      <div className="relative border-t-2 border-dashed border-line bg-card px-5 pt-4 pb-5">
        <h3 className="font-serif text-[1.65rem] leading-tight text-ink">{event.title}</h3>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {event.venue ? `${event.venue} · ` : ''}
          {event.city}
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3 text-sm">
          <div>
            <dt className="text-[0.7rem] tracking-wider text-ink-faint uppercase">Coming</dt>
            <dd className="tabular font-medium">
              {g.coming}
              <span className="text-ink-faint">/{event.guestTarget || g.heads}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[0.7rem] tracking-wider text-ink-faint uppercase">Budget</dt>
            <dd className="tabular font-medium">{formatMoneyCompact(event.budget, event.currency)}</dd>
          </div>
          <div>
            <dt className="text-[0.7rem] tracking-wider text-ink-faint uppercase">Paid</dt>
            <dd className="tabular font-medium">{b.planned ? Math.round((b.paid / b.planned) * 100) : 0}%</dd>
          </div>
        </dl>
      </div>
    </>
  )

  const inner = <div className="ticket-notch overflow-hidden rounded-sm">{body}</div>

  if (preview) return <article className={`drop-stamp ${className}`}>{inner}</article>

  return (
    <Link
      to={`/app/events/${event.id}`}
      className={`drop-stamp block transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 ${className}`}
      aria-label={`${event.title}, ${EVENT_TYPES[event.type].label}`}
    >
      {inner}
    </Link>
  )
}
