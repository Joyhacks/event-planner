import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { toE164Nigeria } from '../../lib/phone'
import { errorMessage, supabase } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export default function VerifyPhone() {
  return (
    <RequireAuth>
      <Verify />
    </RequireAuth>
  )
}

function Verify() {
  useDocumentTitle('Verify your phone')
  const { phoneVerified, refreshProfile } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [e164, setE164] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const next = params.get('next')?.startsWith('/') ? params.get('next')! : '/events'

  if (phoneVerified) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl">Your phone is verified.</h1>
        <Button variant="ink" className="mt-6" onClick={() => navigate(next)}>
          Continue
        </Button>
      </div>
    )
  }

  const sendCode = async (e: FormEvent) => {
    e.preventDefault()
    const normalised = toE164Nigeria(phone)
    if (!normalised) return setError('Enter a Nigerian number like 0803 123 4567, or an international number starting with +.')
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ phone: normalised })
    setBusy(false)
    if (err) {
      // One number, one account: this is what stops people farming free votes.
      if ((err as { code?: string }).code === 'phone_exists') return setError('That number is already linked to another Ariya account.')
      return setError(await errorMessage(err))
    }
    setE164(normalised)
  }

  const confirm = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: 'phone_change' })
    setBusy(false)
    if (err) return setError(await errorMessage(err))
    await refreshProfile()
    navigate(next)
  }

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <h1 className="font-display text-[2.2rem] leading-[0.95] sm:text-5xl">Verify your phone</h1>
      <p className="mt-4 font-medium text-ink-soft">
        One free vote per person keeps contests fair. We text you a 6-digit code once; your number is never shown to anyone.
      </p>
      <div className="mt-8 rounded-lg border-2 border-ink bg-card p-6 shadow-hard">
        {!e164 ? (
          <form onSubmit={sendCode} noValidate className="flex flex-col gap-4">
            <Field label="Phone number" error={error}>
              {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 123 4567" />}
            </Field>
            <Button type="submit" variant="danfo" disabled={busy}>
              {busy ? 'Sending…' : 'Text me a code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirm} noValidate className="flex flex-col gap-4">
            <Field label="6-digit code" error={error} hint={`Sent to +${e164}`}>
              {(p) => <Input {...p} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} />}
            </Field>
            <Button type="submit" variant="danfo" disabled={busy || code.trim().length < 6}>
              {busy ? 'Checking…' : 'Verify'}
            </Button>
            <Button variant="ghost" onClick={() => setE164('')}>
              Use a different number
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
