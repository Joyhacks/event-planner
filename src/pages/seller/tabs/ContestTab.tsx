import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from '../../../components/styles'
import { Button, Field, Input } from '../../../components/ui'
import { naira, nairaInputToKobo } from '../../../lib/money'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import type { Contest, Contestant, VotePackage } from '../../../lib/types'
import { fromLocalInput } from '../../../lib/when'
import { PhotoUpload } from '../../market/EventPage'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

export function ContestTab({ event }: TabProps) {
  const contests = useQuery({
    queryKey: ['seller-contests', event.id],
    queryFn: async () => (await unwrap(await supabase.from('contests').select('*').eq('event_id', event.id))) as Contest[],
  })
  const [f, setF] = useState({ title: '', starts: '', ends: '', free: true, permit: false })
  const [error, setError] = useState('')

  const create = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!f.title.trim() || !f.starts || !f.ends) return setError('Add a title and voting dates.')
    if (!f.permit) return setError('Please confirm you hold any permit your state requires for paid contests.')
    const { error: err } = await supabase.from('contests').insert({
      event_id: event.id,
      title: f.title.trim(),
      voting_starts_at: fromLocalInput(f.starts),
      voting_ends_at: fromLocalInput(f.ends),
      free_votes_enabled: f.free,
      permit_confirmed: true,
    })
    if (err) return setError(await errorMessage(err))
    await contests.refetch()
  }

  if (contests.data?.length) return <ContestManager contest={contests.data[0]!} eventId={event.id} />

  return (
    <form onSubmit={create} noValidate className="max-w-2xl">
      <Panel title="Start a voting contest" tone="soft">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contest name" className="sm:col-span-2">
            {(p) => <Input {...p} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Face of Detty Owambe" />}
          </Field>
          <Field label="Voting opens">
            {(p) => <Input {...p} type="datetime-local" value={f.starts} onChange={(e) => setF({ ...f, starts: e.target.value })} />}
          </Field>
          <Field label="Voting closes">
            {(p) => <Input {...p} type="datetime-local" value={f.ends} onChange={(e) => setF({ ...f, ends: e.target.value })} />}
          </Field>
          <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" checked={f.free} onChange={(e) => setF({ ...f, free: e.target.checked })} />
            Allow one free vote per phone-verified person
          </label>
          <label className="flex items-start gap-2 text-sm font-bold sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={f.permit} onChange={(e) => setF({ ...f, permit: e.target.checked })} />
            I confirm I hold any promotional-competition permit my state requires for paid voting (for example from the Lagos State Lotteries and Gaming Authority).
          </label>
        </div>
        <div className="mt-4">
          <ErrorNote message={error} />
          <Button type="submit" variant="ink" className="mt-2">
            Create contest
          </Button>
        </div>
      </Panel>
    </form>
  )
}

function ContestManager({ contest, eventId }: { contest: Contest; eventId: string }) {
  const people = useQuery({
    queryKey: ['seller-contestants', contest.id],
    queryFn: async () => (await unwrap(await supabase.from('contestants').select('*').eq('contest_id', contest.id).order('number'))) as Contestant[],
  })
  const packages = useQuery({
    queryKey: ['seller-packages', contest.id],
    queryFn: async () => (await unwrap(await supabase.from('vote_packages').select('*').eq('contest_id', contest.id).order('price_kobo'))) as VotePackage[],
  })
  const entry = useQuery({
    queryKey: ['seller-entry', contest.id],
    queryFn: async () => (await unwrap(await supabase.from('ticket_types').select('id, price_kobo, quantity, sold').eq('contest_id', contest.id).maybeSingle())) as { id: string; price_kobo: number; quantity: number; sold: number } | null,
  })
  const [c, setC] = useState({ name: '', bio: '', photo: '' })
  const [pk, setPk] = useState({ votes: '', price: '' })
  const [en, setEn] = useState({ price: '', spots: '30' })
  const [error, setError] = useState('')

  const addContestant = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!c.name.trim()) return setError('Add the contestant’s name.')
    const { error: err } = await supabase.from('contestants').insert({ contest_id: contest.id, display_name: c.name.trim(), bio: c.bio.trim(), photo_url: c.photo || null, number: 0 })
    if (err) return setError(await errorMessage(err))
    setC({ name: '', bio: '', photo: '' })
    await people.refetch()
  }
  const addPackage = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const price = nairaInputToKobo(pk.price)
    if (!Number(pk.votes) || !price || Number.isNaN(price)) return setError('Enter votes and price, e.g. 10 votes for ₦500.')
    const { error: err } = await supabase.from('vote_packages').insert({ contest_id: contest.id, votes: Number(pk.votes), price_kobo: price })
    if (err) return setError(await errorMessage(err))
    setPk({ votes: '', price: '' })
    await packages.refetch()
  }
  const addEntry = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    const price = en.price.trim() === '' || en.price.trim() === '0' ? 0 : nairaInputToKobo(en.price)
    if (Number.isNaN(price)) return setError('Enter the entry fee.')
    const { error: err } = await supabase.from('ticket_types').insert({
      event_id: eventId,
      name: `${contest.title} entry`,
      kind: 'entry',
      price_kobo: price,
      quantity: Number(en.spots) || 30,
      contest_id: contest.id,
      max_per_order: 1,
    })
    if (err) return setError(await errorMessage(err))
    await entry.refetch()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <Panel title={contest.title}>
          <Link to={`/c/${contest.id}`} target="_blank" className={buttonClass('outline', 'sm')}>
            Open leaderboard <ExternalLink size={14} aria-hidden="true" />
          </Link>
          <ul className="mt-4 divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
            {!people.data?.length && <li className="px-4 py-6 text-center text-sm text-ink-soft">No contestants yet.</li>}
            {people.data?.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-10 w-10 rounded-full border-2 border-ink object-cover" />
                  ) : (
                    <span className="font-sign grid h-10 w-10 place-items-center rounded-full border-2 border-ink bg-danfo">{p.number}</span>
                  )}
                  <div>
                    <p className="font-bold">
                      #{p.number} {p.display_name}
                    </p>
                    <p className="tabular text-sm text-ink-soft">{p.votes_count.toLocaleString('en-NG')} votes</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await supabase.from('contestants').update({ status: p.status === 'active' ? 'withdrawn' : 'active' }).eq('id', p.id)
                    await people.refetch()
                  }}
                >
                  {p.status === 'active' ? 'Withdraw' : 'Reinstate'}
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Vote bundles">
          {!packages.data?.length ? (
            <Empty>Add bundles like 10 votes for ₦500 and 50 votes for ₦2,000.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {packages.data.map((p) => (
                <li key={p.id} className="rounded-md border-2 border-ink bg-danfo-soft px-3 py-2 font-bold">
                  {p.votes} votes · {naira(p.price_kobo)}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addPackage} noValidate className="mt-4 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <Field label="Votes">{(x) => <Input {...x} inputMode="numeric" value={pk.votes} onChange={(e) => setPk({ ...pk, votes: e.target.value })} placeholder="10" />}</Field>
            <Field label="Price (₦)">{(x) => <Input {...x} inputMode="decimal" value={pk.price} onChange={(e) => setPk({ ...pk, price: e.target.value })} placeholder="500" />}</Field>
            <Button type="submit" variant="ink">
              Add
            </Button>
          </form>
        </Panel>
      </div>
      <div className="flex flex-col gap-6 lg:col-span-5">
        <form onSubmit={addContestant} noValidate>
          <Panel title="Add a contestant" tone="soft">
            <div className="flex flex-col gap-3">
              <Field label="Name">{(x) => <Input {...x} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />}</Field>
              <Field label="Bio">{(x) => <Input {...x} value={c.bio} onChange={(e) => setC({ ...c, bio: e.target.value })} />}</Field>
              <PhotoUpload value={c.photo || undefined} onUploaded={(u) => setC((x) => ({ ...x, photo: u }))} />
              <ErrorNote message={error} />
              <Button type="submit" variant="ink">
                Add contestant
              </Button>
            </div>
          </Panel>
        </form>
        <Panel title="Let contestants sign up">
          {entry.data ? (
            <p className="font-medium">
              Entry is open at {entry.data.price_kobo ? naira(entry.data.price_kobo) : 'no cost'} · {entry.data.sold} of {entry.data.quantity} spots taken. Buyers of the
              entry ticket become contestants automatically, with their bio and photo.
            </p>
          ) : (
            <form onSubmit={addEntry} noValidate className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field label="Entry fee (₦)">{(x) => <Input {...x} inputMode="decimal" value={en.price} onChange={(e) => setEn({ ...en, price: e.target.value })} placeholder="10,000" />}</Field>
              <Field label="Spots">{(x) => <Input {...x} inputMode="numeric" value={en.spots} onChange={(e) => setEn({ ...en, spots: e.target.value })} />}</Field>
              <Button type="submit" variant="ink">
                Open entry
              </Button>
            </form>
          )}
        </Panel>
      </div>
    </div>
  )
}
