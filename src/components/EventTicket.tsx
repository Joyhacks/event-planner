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

/** An event rendered as a gate pass: loud cover, perforation, stub with the numbers. */
export function EventTicket({ event, preview = false, className = '' }: Props) {
  const meta = EVENT_TYPES[event.type]
  const days = daysUntil(event.date)
  const date = parseLocalDate(event.date)
  const g = guestStats(event.guests)
  const b = budgetStats(event.budgetItems, event.budget)

  const body = (
    <>
      <div className="relative h-44 overflow-hidden px-5 pt-4 pb-4" style={{ background: meta.bg, color: meta.fg }}>
        <Motif kind={meta.motif} color={meta.accent} opacity={0.14} />
        <div className="relative flex items-start justify-between">
          <span className="rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-[0.7rem] font-extrabold tracking-[0.1em] text-ink uppercase">
            {meta.short}
          </span>
          <time dateTime={event.date} className="font-sign text-right text-[0.95rem] leading-[1.05]">
            {date.toLocaleDateString('en-NG', { day: '2-digit' })}
            <br />
            {date.toLocaleDateString('en-NG', { month: 'short' }).toUpperCase()}
          </time>
        </div>
        <div className="absolute bottom-4 left-5 flex items-end gap-2.5">
          <span className="tabular font-sign text-[4.2rem] leading-[0.8]">{days >= 0 ? days : '✓'}</span>
          <span className="pb-0.5 text-[0.7rem] leading-tight font-extrabold tracking-[0.12em] uppercase">
            {days > 1 ? (
              <>
                Days
                <br />
                to go
              </>
            ) : days === 1 ? (
              <>
                Day
                <br />
                to go
              </>
            ) : days === 0 ? (
              'Today!'
            ) : (
              'Done'
            )}
          </span>
        </div>
      </div>

      <div className="relative border-t-2 border-dashed border-ink bg-card px-5 pt-4 pb-5">
        <span aria-hidden="true" className="absolute -top-[11px] -left-[11px] h-5 w-5 rounded-full border-2 border-ink bg-paper" />
        <span aria-hidden="true" className="absolute -top-[11px] -right-[11px] h-5 w-5 rounded-full border-2 border-ink bg-paper" />
        <h3 className="font-display truncate text-[1.35rem] leading-tight">{event.title}</h3>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {event.venue ? `${event.venue} · ` : ''}
          {event.city}
        </p>
        <dl className="mt-4 grid grid-cols-3 divide-x-2 divide-ink rounded-md border-2 border-ink text-sm">
          {[
            ['Coming', `${g.coming}/${event.guestTarget || g.heads}`],
            ['Budget', formatMoneyCompact(event.budget, event.currency)],
            ['Paid', `${b.planned ? Math.round((b.paid / b.planned) * 100) : 0}%`],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse px-2.5 py-2">
              <dd className="tabular truncate font-bold">{value}</dd>
              <dt className="text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </>
  )

  const shell = `block overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard ${className}`

  if (preview) return <article className={shell}>{body}</article>

  return (
    <Link
      to={`/app/events/${event.id}`}
      className={`${shell} transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg`}
      aria-label={`${event.title}, ${meta.label}`}
    >
      {body}
    </Link>
  )
}
