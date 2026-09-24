import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Motif } from '../../components/Motif'
import { BackendMissing } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { CATEGORY_LABEL } from '../../lib/market'
import { backendReady, supabase, unwrap } from '../../lib/supabase'
import type { MarketEvent } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatWhen } from '../../lib/when'

const COVER_COLORS = ['#ffc700', '#f0287a', '#008751', '#2447d6', '#0e0e0e']

export default function Events() {
  useDocumentTitle('Events')
  const [params, setParams] = useSearchParams()
  const category = params.get('category')
  const city = params.get('city') ?? ''

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', category, city],
    enabled: backendReady,
    queryFn: async () => {
      let q = supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'postponed'])
        .gte('starts_at', new Date(Date.now() - 6 * 3600 * 1000).toISOString())
        .order('starts_at')
        .limit(60)
      if (category) q = q.eq('category', category)
      if (city) q = q.ilike('city', city)
      return (await unwrap(await q)) as MarketEvent[]
    },
  })

  if (!backendReady) return <BackendMissing />
  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-10 pb-24 sm:px-8 lg:pt-14">
      <h1 className="font-display text-[2.6rem] leading-[0.95] sm:text-6xl">
        What’s <em className="hl">happening.</em>
      </h1>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        {[null, ...Object.keys(CATEGORY_LABEL)].map((c) => (
          <button
            key={c ?? 'all'}
            type="button"
            aria-pressed={category === c}
            onClick={() => setParam('category', c)}
            className={`h-9 rounded-full border-2 border-ink px-3.5 text-sm font-bold ${category === c ? 'bg-ink text-danfo' : 'bg-card hover:bg-danfo-soft'}`}
          >
            {c ? CATEGORY_LABEL[c] : 'All'}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          <MapPin size={16} aria-hidden="true" />
          <span className="sr-only">City</span>
          <input
            value={city}
            onChange={(e) => setParam('city', e.target.value || null)}
            placeholder="Any city"
            className="h-9 w-36 rounded-md border-2 border-ink bg-card px-2 font-medium"
          />
        </label>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <p className="mt-10 font-medium text-red">{(error as Error).message}</p>
      ) : !data?.length ? (
        <p className="mt-10 rounded-lg border-2 border-dashed border-ink px-6 py-12 text-center font-medium text-ink-soft">
          No events here yet. Organisers are adding new ones every week.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((e, i) => (
            <li key={e.id}>
              <Link
                to={`/e/${e.slug}`}
                className="group block overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard transition-[transform,box-shadow] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
              >
                <div className="relative aspect-[16/9] overflow-hidden border-b-2 border-ink" style={{ background: COVER_COLORS[i % COVER_COLORS.length] }}>
                  {e.cover_url ? (
                    <img src={e.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Motif kind="oniko" color={i % 5 === 4 ? '#ffc700' : '#0e0e0e'} opacity={0.15} />
                  )}
                  <span className="absolute top-3 left-3 rounded-full border-2 border-ink bg-white px-2.5 py-0.5 text-[0.7rem] font-extrabold tracking-[0.1em] uppercase">
                    {CATEGORY_LABEL[e.category] ?? e.category}
                  </span>
                  {e.status === 'postponed' && (
                    <span className="absolute top-3 right-3 rounded-full border-2 border-ink bg-pink px-2.5 py-0.5 text-[0.7rem] font-extrabold uppercase">
                      Postponed
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-display text-xl leading-tight">{e.title}</h2>
                  <p className="mt-1 text-sm font-semibold">{formatWhen(e.starts_at)}</p>
                  <p className="text-sm text-ink-soft">{[e.venue, e.city].filter(Boolean).join(', ')}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
