import { useState, type FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { BackendMissing } from '../../components/RequireAuth'
import { Signboard } from '../../components/Signboard'
import { Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { backendReady, errorMessage, supabase } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

import { safeNext } from '../../lib/safeNext'

export default function SignIn() {
  useDocumentTitle('Sign in')
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const { user, error: authError } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!backendReady) return <BackendMissing />
  if (user) return <Navigate to={next} replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError('Enter a valid email address.')
    setBusy(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
          data: name.trim() ? { full_name: name.trim() } : undefined,
        },
      })
      if (err) throw err
      setSent(true)
    } catch (e) {
      setError(await errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-12 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
      <div>
        <h1 className="font-display text-[2.6rem] leading-[0.95] sm:text-6xl">
          Sign in with a <em className="hl">magic link.</em>
        </h1>
        <p className="mt-5 max-w-md text-lg font-medium text-ink-soft">
          No password to forget. We email you a link; tap it on this device and you are in.
        </p>
      </div>
      <div className="rounded-lg border-2 border-ink bg-card p-6 shadow-hard sm:p-8">
        {sent ? (
          <div role="status">
            <Signboard className="-rotate-1">
              <p className="font-sign text-2xl leading-tight">Check your email</p>
            </Signboard>
            <p className="mt-6 font-medium">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this phone or computer. It can take a
              minute; check spam or promotions too.
            </p>
            <Button variant="ghost" className="mt-4" onClick={() => setSent(false)}>
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            <Field label="Email" error={error || authError}>
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              )}
            </Field>
            <Field label="Your name" hint="Used on your profile and by your planning committee.">
              {(p) => (
                <Input
                  {...p}
                  maxLength={120}
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bisi Adeyemi"
                />
              )}
            </Field>
            <Button type="submit" variant="danfo" size="lg" disabled={busy}>
              {busy ? 'Sending…' : 'Email me a sign-in link'}
            </Button>
            <p className="text-sm text-ink-soft">
              By continuing you agree to our{' '}
              <Link className="underline" to="/legal/terms">
                terms
              </Link>{' '}
              and{' '}
              <Link className="underline" to="/legal/privacy">
                privacy policy
              </Link>
              .
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
