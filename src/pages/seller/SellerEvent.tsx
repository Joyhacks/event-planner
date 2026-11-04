import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { buttonClass } from '../../components/styles'
import { Pill } from '../../components/ui'
import { supabase, unwrap } from '../../lib/supabase'
import type { MarketEvent } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatWhen } from '../../lib/when'
import { AsoebiTab } from './tabs/AsoebiTab'
import { ContestTab } from './tabs/ContestTab'
import { DetailsTab } from './tabs/DetailsTab'
import { DoorTab } from './tabs/DoorTab'
import { PromosTab } from './tabs/PromosTab'
import { SalesTab } from './tabs/SalesTab'
import { StatusTab } from './tabs/StatusTab'
import { TicketsTab } from './tabs/TicketsTab'

const TABS = [
  ['details', 'Details'],
  ['tickets', 'Tickets'],
  ['promos', 'Promos & promoters'],
  ['asoebi', 'Aso-ebi'],
  ['contest', 'Contest'],
  ['sales', 'Sales'],
  ['door', 'Door'],
  ['status', 'Postpone / cancel'],
] as const

export type TabProps = { event: MarketEvent; refresh: () => Promise<void> }

export default function SellerEvent() {
  return (
    <RequireAuth role="seller">
      <Workspace />
    </RequireAuth>
  )
}

function Workspace() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'details'
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['seller-event', id],
    queryFn: async () => (await unwrap(await supabase.from('events').select('*').eq('id', id).maybeSingle())) as MarketEvent | null,
  })
  useDocumentTitle(q.data?.title ?? 'Event')
  if (q.isLoading) return <PageLoader />
  if (!q.data) return <p className="px-5 py-20 text-center font-bold">Event not found.</p>
  const event = q.data
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['seller-event', id] })
    await qc.invalidateQueries({ queryKey: ['seller-events'] })
  }
  const props = { event, refresh }

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-8 pb-24 sm:px-8">
      <Link to="/seller" className="inline-flex items-center gap-1.5 text-sm font-bold hover:underline">
        <ArrowLeft size={16} strokeWidth={2.5} aria-hidden="true" /> My events
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Pill tone={event.status === 'published' ? 'green' : event.status === 'draft' ? 'neutral' : event.status === 'cancelled' ? 'red' : 'pink'}>
            {event.status}
          </Pill>
          <h1 className="font-display mt-2 text-[2.2rem] leading-[0.95] sm:text-5xl">{event.title}</h1>
          <p className="mt-2 font-semibold">{formatWhen(event.starts_at)}</p>
        </div>
        <Link to={`/e/${event.slug}`} target="_blank" className={buttonClass('outline', 'sm')}>
          View public page <ExternalLink size={14} aria-hidden="true" />
        </Link>
      </div>

      <nav aria-label="Event sections" className="mt-8 flex gap-1 overflow-x-auto border-b-2 border-ink pb-2 [scrollbar-width:none]">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => setParams({ tab: key }, { replace: true })}
            className={`h-10 shrink-0 rounded-full px-4 text-sm font-bold whitespace-nowrap ${tab === key ? 'bg-ink text-danfo' : 'text-ink-soft hover:bg-paper-2'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="pt-8">
        {tab === 'details' && <DetailsTab {...props} />}
        {tab === 'tickets' && <TicketsTab {...props} />}
        {tab === 'promos' && <PromosTab {...props} />}
        {tab === 'asoebi' && <AsoebiTab {...props} />}
        {tab === 'contest' && <ContestTab {...props} />}
        {tab === 'sales' && <SalesTab {...props} />}
        {tab === 'door' && <DoorTab {...props} />}
        {tab === 'status' && <StatusTab {...props} />}
      </div>
    </div>
  )
}
