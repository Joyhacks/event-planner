import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { Signboard } from '../../components/Signboard'
import { buttonClass } from '../../components/styles'
import { errorMessage, supabase } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export default function CheckoutReturn() {
  return (
    <RequireAuth>
      <Confirm />
    </RequireAuth>
  )
}

function Confirm() {
  useDocumentTitle('Confirming payment')
  const [params] = useSearchParams()
  const reference = params.get('reference') ?? params.get('trxref') ?? ''
  const [state, setState] = useState<'checking' | 'paid' | 'pending' | 'problem'>(reference ? 'checking' : 'problem')
  const [kind, setKind] = useState<string>('purchase')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    const check = async (attempt: number) => {
      const { data, error } = await supabase.functions.invoke('verify-payment', { body: { reference } })
      if (cancelled) return
      if (error) {
        setState('problem')
        setMessage(await errorMessage(error))
        return
      }
      const { data: order } = await supabase.from('orders').select('status, kind').eq('reference', reference).maybeSingle()
      if (order?.kind) setKind(order.kind)
      if (data?.status === 'paid' || order?.status === 'paid') return setState('paid')
      if (order?.status === 'flagged') {
        setState('problem')
        setMessage('We received a payment that did not match the order total. Our team will contact you; nothing is lost.')
        return
      }
      if (attempt < 8) setTimeout(() => void check(attempt + 1), 2500)
      else setState('pending')
    }
    if (reference) void check(0)
    return () => {
      cancelled = true
    }
  }, [reference])

  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      {state === 'checking' && (
        <p role="status" className="font-display text-2xl">
          Confirming your payment with Paystack…
        </p>
      )}
      {state === 'paid' && (
        <>
          <Signboard className="mx-auto inline-block -rotate-2 px-8">
            <p className="font-sign text-4xl">{kind === 'votes' ? 'Votes in!' : 'You’re in!'}</p>
          </Signboard>
          <p className="mt-8 text-lg font-medium">
            {kind === 'votes' ? 'Your votes have been added to the leaderboard.' : 'Payment received. Your tickets are ready.'}
          </p>
          <Link to={kind === 'votes' ? '/events' : '/account/tickets'} className={buttonClass('ink', 'lg', 'mt-8')}>
            {kind === 'votes' ? 'Back to events' : 'See my tickets'}
          </Link>
        </>
      )}
      {state === 'pending' && (
        <>
          <h1 className="font-display text-2xl">Still waiting for Paystack.</h1>
          <p className="mt-3 font-medium text-ink-soft">
            If you were charged, your tickets will appear in a few minutes. Reference: <strong>{reference}</strong>
          </p>
          <Link to="/account/tickets" className={buttonClass('ink', 'md', 'mt-8')}>
            My tickets
          </Link>
        </>
      )}
      {state === 'problem' && (
        <>
          <h1 className="font-display text-2xl">We couldn’t confirm this payment.</h1>
          <p className="mt-3 font-medium text-ink-soft">{message || 'The payment link is missing its reference.'}</p>
          <p className="mt-2 text-sm text-ink-soft">Reference: {reference || 'none'}</p>
        </>
      )}
    </div>
  )
}
