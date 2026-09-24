import { Link } from 'react-router-dom'
import { BackendMissing } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { Sticker } from '../../components/ui'
import { backendReady } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatCountdown, useNow } from '../../lib/useNow'
import { useContest } from './useContest'
import { useContestId } from './useContestId'

const ROW = 88

export default function ContestPage() {
  const resolved = useContestId()
  if (resolved.loading) return <PageLoader />
  if (!resolved.id) return <p className="px-5 py-20 text-center font-bold">Contest not found.</p>
  return <Board contestId={resolved.id} />
}

function Board({ contestId }: { contestId: string }) {
  const q = useContest(contestId)
  const now = useNow()
  useDocumentTitle(q.data?.contest.title ?? 'Contest')
  if (!backendReady) return <BackendMissing />
  if (q.isLoading) return <PageLoader />
  if (!q.data) return <p className="px-5 py-20 text-center font-bold">Contest not found.</p>

  const { contest, contestants } = q.data
  const ranked = [...contestants].sort((a, b) => b.votes_count - a.votes_count || a.number - b.number)
  const leader = Math.max(1, ranked[0]?.votes_count ?? 1)
  const ends = Date.parse(contest.voting_ends_at)
  const starts = Date.parse(contest.voting_starts_at)

  return (
    <div>
      <section className="grain border-b-2 border-ink bg-pink">
        <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 lg:py-16">
          {contest.events && (
            <Link to={`/e/${contest.events.slug}`} className="text-sm font-bold hover:underline">
              {contest.events.title}
            </Link>
          )}
          <h1 className="font-display mt-3 text-[2.6rem] leading-[0.92] sm:text-7xl">{contest.title}</h1>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Sticker tone="ink" className="-rotate-2 text-lg">
              {now < starts ? `Opens in ${formatCountdown(starts - now)}` : now < ends ? `Closes in ${formatCountdown(ends - now)}` : 'Voting closed'}
            </Sticker>
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green" aria-hidden="true" /> Live leaderboard
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8">
        {ranked.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-ink px-6 py-12 text-center font-medium text-ink-soft">No contestants yet.</p>
        ) : (
          <ol className="relative" style={{ height: ranked.length * ROW }} aria-label="Leaderboard">
            {ranked.map((c, i) => (
              <li
                key={c.id}
                className="absolute inset-x-0 transition-transform duration-700 ease-out"
                style={{ transform: `translateY(${i * ROW}px)`, height: ROW - 12 }}
              >
                <Link
                  to={contest.events ? `/e/${contest.events.slug}/vote/${c.number}` : `/c/${contest.id}/${c.number}`}
                  className="flex h-full items-center gap-4 rounded-lg border-2 border-ink bg-card px-4 shadow-hard-sm transition-colors hover:bg-danfo-soft"
                >
                  <span className={`font-sign grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-ink ${i === 0 ? 'bg-danfo' : 'bg-white'}`}>{i + 1}</span>
                  {c.photo_url ? (
                    <img src={c.photo_url} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 border-ink object-cover" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">
                      <span className="text-ink-faint">#{c.number}</span> {c.display_name}
                    </p>
                    <div className="mt-1.5 h-3 overflow-hidden rounded-full border-2 border-ink bg-white">
                      <div className="h-full bg-pink transition-[width] duration-700 ease-out" style={{ width: `${Math.max(2, (c.votes_count / leader) * 100)}%` }} />
                    </div>
                  </div>
                  {contest.show_counts && <span className="font-sign tabular shrink-0 text-lg">{c.votes_count.toLocaleString('en-NG')}</span>}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
