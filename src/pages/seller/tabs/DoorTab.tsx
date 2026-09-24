import { useQuery } from '@tanstack/react-query'
import { ScanLine } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass } from '../../../components/styles'
import { Button, ConfirmButton, Field, Input } from '../../../components/ui'
import { errorMessage, supabase, unwrap } from '../../../lib/supabase'
import type { TabProps } from '../SellerEvent'
import { Empty, ErrorNote, Panel } from './shared'

export function DoorTab({ event }: TabProps) {
  const staff = useQuery({
    queryKey: ['staff', event.id],
    queryFn: async () => (await unwrap(await supabase.from('event_staff').select('user_id, email, created_at').eq('event_id', event.id))) as { user_id: string; email: string; created_at: string }[],
  })
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const add = async (e: FormEvent) => {
    e.preventDefault()
    setMsg('')
    setError('')
    const { data, error: err } = await supabase.rpc('add_event_staff', { p_event: event.id, p_email: email })
    if (err) return setError(await errorMessage(err))
    if (!data) return setError('No Ariya account uses that email yet. Ask them to sign in once, then add them again.')
    setMsg(`${email} can now scan tickets for this event.`)
    setEmail('')
    await staff.refetch()
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Scan tickets at the door" tone="soft">
        <p className="font-medium">
          Open the scanner on any phone. It downloads the guest list first, so it keeps working if the network drops, and syncs when it is back.
        </p>
        <Link to={`/scan/${event.id}`} className={buttonClass('ink', 'lg', 'mt-5')}>
          <ScanLine size={19} aria-hidden="true" /> Open scanner
        </Link>
      </Panel>
      <Panel title="Door team">
        <form onSubmit={add} noValidate className="flex items-end gap-2">
          <Field label="Add by email" className="flex-1">
            {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hostess@example.com" />}
          </Field>
          <Button type="submit" variant="ink">
            Add
          </Button>
        </form>
        <div className="mt-3">
          <ErrorNote message={error} />
          {msg && <p className="text-sm font-bold text-green">{msg}</p>}
        </div>
        <div className="mt-4">
          {!staff.data?.length ? (
            <Empty>Only you can scan right now.</Empty>
          ) : (
            <ul className="divide-y-2 divide-ink overflow-hidden rounded-md border-2 border-ink">
              {staff.data.map((s) => (
                <li key={s.user_id} className="flex items-center justify-between px-4 py-3 text-sm font-medium">
                  <span>{s.email || 'Door staff'}</span>
                  <ConfirmButton
                    variant="ghost"
                    size="sm"
                    onConfirm={async () => {
                      await supabase.from('event_staff').delete().eq('event_id', event.id).eq('user_id', s.user_id)
                      await staff.refetch()
                    }}
                  >
                    Remove
                  </ConfirmButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  )
}
