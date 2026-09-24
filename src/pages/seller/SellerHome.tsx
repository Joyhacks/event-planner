import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { Button, Field, Input, Pill, Select } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { slugify } from '../../lib/csv'
import { CATEGORY_LABEL } from '../../lib/market'
import { errorMessage, supabase, unwrap } from '../../lib/supabase'
import type { MarketEvent } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatWhen, fromLocalInput } from '../../lib/when'

export default function SellerHome() {
  return (
    <RequireAuth role="seller">
      <Home />
    </RequireAuth>
  )
}

function Home() {
  useDocumentTitle('My events')
  const { user } = useAuth()
  const navigate = useNavigate()
  const events = useQuery({
    queryKey: ['seller-events', user?.id],
    queryFn: async () =>
      (await unwrap(await supabase.from('events').select('*').eq('seller_id', user!.id).order('starts_at', { ascending: false }))) as MarketEvent[],
  })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'party', city: 'Lagos', starts_at: '' })
  const [error, setError] = useState('')

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (form.title.trim().length < 2) return setError('Give the event a name.')
    if (!form.starts_at) return setError('Pick the date and time.')
    setError('')
    const slug = `${slugify(form.title).slice(0, 60)}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error: err } = await supabase
      .from('events')
      .insert({ seller_id: user!.id, slug, title: form.title.trim(), category: form.category, city: form.city.trim(), starts_at: fromLocalInput(form.starts_at) })
      .select('id')
      .single()
    if (err) return setError(await errorMessage(err))
    navigate(`/seller/events/${data.id}`)
  }

  if (events.isLoading) return <PageLoader />

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-10 pb-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">My events</h1>
        <Button variant="ink" onClick={() => setOpen((o) => !o)}>
          <Plus size={18} strokeWidth={2.5} aria-hidden="true" /> New event
        </Button>
      </div>

      {open && (
        <form onSubmit={create} noValidate className="mt-8 grid gap-4 rounded-lg border-2 border-ink bg-danfo-soft p-5 shadow-hard sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.3fr_auto] lg:items-end">
          <Field label="Event name" error={error}>
            {(p) => <Input {...p} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Detty Owambe 2026" />}
          </Field>
          <Field label="Type">
            {(p) => (
              <Select {...p} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="City">
            {(p) => <Input {...p} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />}
          </Field>
          <Field label="Starts">
            {(p) => <Input {...p} type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />}
          </Field>
          <Button type="submit" variant="danfo">
            Create
          </Button>
        </form>
      )}

      {!events.data?.length ? (
        <p className="mt-10 rounded-lg border-2 border-dashed border-ink px-6 py-12 text-center font-medium text-ink-soft">
          No events yet. Create one, add ticket types, then publish.
        </p>
      ) : (
        <ul className="mt-10 divide-y-2 divide-ink overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard">
          {events.data.map((e) => (
            <li key={e.id}>
              <Link to={`/seller/events/${e.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-danfo-soft">
                <div>
                  <p className="font-display text-lg">{e.title}</p>
                  <p className="text-sm font-medium text-ink-soft">
                    {formatWhen(e.starts_at)} · {e.city}
                  </p>
                </div>
                <Pill tone={e.status === 'published' ? 'green' : e.status === 'draft' ? 'neutral' : e.status === 'cancelled' ? 'red' : 'pink'}>{e.status}</Pill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
