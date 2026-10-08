import { useEffect, useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input, Select } from '../../components/ui'
import { useCloudPlanner, type MemberRole } from '../../store/cloudPlanner'
import { useEventContext } from './context'
import { useAuth } from '../../lib/authContext'

type Member = { user_id: string; full_name: string; role: MemberRole }
export default function Committee() {
  const { event } = useEventContext()
  const { user } = useAuth()
  const record = useCloudPlanner((s) => s.records[event.id])
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'editor' | 'viewer'>('editor')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const shared = Boolean(record)
  useEffect(() => {
    if (!shared) return
    let cancelled = false
    void import('../../lib/supabase')
      .then(async ({ supabase }) => {
        const { data, error } = await supabase
          .rpc('planner_committee', { target_event: event.id })
          .abortSignal(AbortSignal.timeout(15000))
        if (cancelled) return
        if (error) setError(error.message)
        else setMembers(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the committee. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [event.id, shared, revision])
  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const { supabase } = await import('../../lib/supabase')
      const { data, error } = await supabase.rpc('invite_planner_member', {
        target_event: event.id,
        invitee_email: email.trim(),
        member_role: role,
      })
      if (error) throw error
      if (!data) throw new Error('Ask this person to create an Ariya account first, then add them again.')
      setStatus('Access added. Share this event’s address with them. No email was sent.')
      setEmail('')
      setRevision((r) => r + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const remove = async (id: string) => {
    setBusy(true)
    setError('')
    try {
      const { supabase } = await import('../../lib/supabase')
      const { error } = await supabase.from('planner_members').delete().eq('event_id', event.id).eq('user_id', id)
      if (error) throw error
      setRevision((r) => r + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (!record) return <p>Save this event to your account to add committee members.</p>
  return (
    <section className="max-w-2xl">
      <h2 className="font-display text-2xl">Planning committee</h2>
      <p className="mt-3">
        Editors can update the plan. Viewers can read it and download a copy. Only the owner can add people or delete
        the event. Members need an Ariya account.
      </p>
      <ul className="mt-6 divide-y-2 divide-ink rounded-lg border-2 border-ink bg-card">
        {members.map((m) => (
          <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <span>
              {m.full_name || 'Committee member'}
              {m.user_id === user?.id ? ' (you)' : ''} · {m.role}
            </span>
            {record.role === 'owner' && m.role !== 'owner' && (
              <ConfirmButton
                disabled={busy}
                size="sm"
                variant="ghost"
                confirmLabel="Remove access?"
                onConfirm={() => void remove(m.user_id)}
              >
                Remove
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>
      {record.role === 'owner' && (
        <form onSubmit={(e) => void invite(e)} className="mt-8 flex flex-col gap-4">
          <Field label="Member email">
            {(p) => (
              <Input
                {...p}
                required
                type="email"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <Field label="Access">
            {(p) => (
              <Select {...p} value={role} onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </Select>
            )}
          </Field>
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? 'Adding…' : 'Add committee member'}
          </Button>
        </form>
      )}
      {error && (
        <p className="mt-4 text-red" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="mt-4 text-green" role="status">
          {status}
        </p>
      )}
    </section>
  )
}
