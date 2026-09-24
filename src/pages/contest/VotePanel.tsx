import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { buttonClass } from '../../components/styles'
import { Button } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { naira } from '../../lib/money'
import { useNow } from '../../lib/useNow'
import { errorMessage, supabase } from '../../lib/supabase'
import type { Contest, Contestant, VotePackage } from '../../lib/types'

export function VotePanel({ contest, contestant, packages }: { contest: Contest; contestant: Contestant; packages: VotePackage[] }) {
  const { user, phoneVerified } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const now = useNow(15_000)
  const open = now >= Date.parse(contest.voting_starts_at) && now <= Date.parse(contest.voting_ends_at)
  const here = location.pathname

  if (!open) {
    return <p className="rounded-md bg-paper-2 px-4 py-3 font-bold">{now < Date.parse(contest.voting_starts_at) ? 'Voting has not started yet.' : 'Voting has closed.'}</p>
  }
  if (!user) {
    return (
      <Link to={`/signin?next=${encodeURIComponent(here)}`} className={buttonClass('ink', 'lg', 'w-full')}>
        Sign in to vote
      </Link>
    )
  }

  const free = async () => {
    setError('')
    setMsg('')
    setBusy('free')
    const { data, error: err } = await supabase.rpc('cast_free_vote', { p_contestant: contestant.id })
    setBusy('')
    if (err) return setError(await errorMessage(err))
    setMsg(`Vote counted! ${contestant.display_name} now has ${Number(data).toLocaleString('en-NG')} votes.`)
  }

  const buy = async (pkg: VotePackage) => {
    setError('')
    setBusy(pkg.id)
    const { data, error: err } = await supabase.rpc('create_vote_order', { p_package: pkg.id, p_contestant: contestant.id, p_quantity: 1 })
    if (err) {
      setBusy('')
      return setError(await errorMessage(err))
    }
    const res = await supabase.functions.invoke('checkout', { body: { reference: data.reference, callback_url: `${window.location.origin}/checkout/return` } })
    if (res.error) {
      setBusy('')
      return setError(await errorMessage(res.error))
    }
    window.location.assign(res.data.authorization_url)
  }

  return (
    <div className="flex flex-col gap-3">
      {contest.free_votes_enabled &&
        (phoneVerified ? (
          <Button variant="danfo" size="lg" onClick={() => void free()} disabled={busy !== ''}>
            {busy === 'free' ? 'Voting…' : 'Cast my free vote'}
          </Button>
        ) : (
          <Button variant="danfo" size="lg" onClick={() => navigate(`/account/phone?next=${encodeURIComponent(here)}`)}>
            Verify phone for a free vote
          </Button>
        ))}
      {packages.map((p) => (
        <Button key={p.id} variant="outline" onClick={() => void buy(p)} disabled={busy !== ''}>
          {busy === p.id ? 'Opening Paystack…' : `${p.votes.toLocaleString('en-NG')} votes · ${naira(p.price_kobo)}`}
        </Button>
      ))}
      {msg && (
        <p role="status" className="rounded-md bg-green px-3 py-2 text-sm font-bold text-white">
          {msg}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
          {error}
        </p>
      )}
    </div>
  )
}
