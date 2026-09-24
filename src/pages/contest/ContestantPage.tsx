import { Download, MessageCircle, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BackendMissing } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { buttonClass } from '../../components/styles'
import { Button } from '../../components/ui'
import { downloadBlob } from '../../lib/download'
import { drawShareCard } from '../../lib/shareCard'
import { backendReady } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { useContest } from './useContest'
import { useContestId, voteUrl } from './useContestId'
import { VotePanel } from './VotePanel'

export default function ContestantPage() {
  const resolved = useContestId()
  const { number = '' } = useParams()
  if (resolved.loading) return <PageLoader />
  if (!resolved.id) return <p className="px-5 py-20 text-center font-bold">Contest not found.</p>
  return <Contestant contestId={resolved.id} number={number} />
}

function Contestant({ contestId, number }: { contestId: string; number: string }) {
  const q = useContest(contestId)
  const c = q.data?.contestants.find((x) => String(x.number) === number)
  useDocumentTitle(c ? `Vote ${c.display_name}` : 'Contestant')
  const [card, setCard] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)

  if (!backendReady) return <BackendMissing />
  if (q.isLoading) return <PageLoader />
  if (!q.data || !c) return <p className="px-5 py-20 text-center font-bold">Contestant not found.</p>
  const { contest, contestants, packages } = q.data
  const rank = [...contestants].sort((a, b) => b.votes_count - a.votes_count).findIndex((x) => x.id === c.id) + 1
  const url = voteUrl(contest.events?.slug, contest.id, c.number)
  const text = `Please vote for me, ${c.display_name} (#${c.number}), in ${contest.title}! 🙏🏾\n${url}`

  const makeCard = async () => {
    const b = await drawShareCard({ name: c.display_name, number: c.number, contest: contest.title, url, photoUrl: c.photo_url })
    if (!b) return
    setBlob(b)
    setCard(URL.createObjectURL(b))
  }
  const shareCard = async () => {
    if (!blob) return
    const file = new File([blob], `vote-${c.number}.png`, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text }).catch(() => undefined)
    } else {
      downloadBlob(`vote-${c.number}.png`, blob)
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <Link to={contest.events ? `/e/${contest.events.slug}/vote` : `/c/${contest.id}`} className="text-sm font-bold hover:underline">
          ← {contest.title} leaderboard
        </Link>
        <div className="mt-5 overflow-hidden rounded-lg border-2 border-ink bg-pink shadow-hard-lg">
          {c.photo_url ? (
            <img src={c.photo_url} alt={c.display_name} className="aspect-[4/5] w-full object-cover" />
          ) : (
            <div className="font-sign grid aspect-[4/5] place-items-center text-[9rem]">#{c.number}</div>
          )}
        </div>
      </div>
      <div className="lg:col-span-6">
        <p className="font-sign text-lg text-pink">No. {c.number}</p>
        <h1 className="font-display text-[2.6rem] leading-[0.92] sm:text-6xl">{c.display_name}</h1>
        {c.bio && <p className="mt-4 text-lg font-medium">{c.bio}</p>}
        <dl className="mt-6 flex gap-3">
          <div className="flex flex-col-reverse rounded-lg border-2 border-ink bg-card px-5 py-3 shadow-hard-sm">
            <dd className="font-sign text-3xl">{rank}</dd>
            <dt className="text-xs font-bold tracking-[0.12em] uppercase">Position</dt>
          </div>
          {contest.show_counts && (
            <div className="flex flex-col-reverse rounded-lg border-2 border-ink bg-card px-5 py-3 shadow-hard-sm">
              <dd className="font-sign tabular text-3xl">{c.votes_count.toLocaleString('en-NG')}</dd>
              <dt className="text-xs font-bold tracking-[0.12em] uppercase">Votes</dt>
            </div>
          )}
        </dl>

        <div className="mt-8">
          <VotePanel contest={contest} contestant={c} packages={packages} />
        </div>

        <div className="mt-10 rounded-lg border-2 border-ink bg-danfo-soft p-5">
          <h2 className="font-display text-xl">Share and get votes</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={buttonClass('ink', 'sm')}>
              <MessageCircle size={15} aria-hidden="true" /> WhatsApp
            </a>
            <Button variant="outline" size="sm" onClick={() => void makeCard()}>
              <Share2 size={15} aria-hidden="true" /> Make “Vote for me” card
            </Button>
          </div>
          {card && (
            <div className="mt-5">
              <img src={card} alt={`Vote for ${c.display_name} poster`} className="w-full max-w-xs rounded-md border-2 border-ink" />
              <div className="mt-3 flex gap-2">
                <Button variant="danfo" size="sm" onClick={() => void shareCard()}>
                  <Share2 size={15} aria-hidden="true" /> Share image
                </Button>
                <Button variant="outline" size="sm" onClick={() => blob && downloadBlob(`vote-${c.number}.png`, blob)}>
                  <Download size={15} aria-hidden="true" /> Download
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
