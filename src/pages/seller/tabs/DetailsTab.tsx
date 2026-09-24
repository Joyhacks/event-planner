import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Field, Input, Select } from '../../../components/ui'
import { CATEGORY_LABEL } from '../../../lib/market'
import { errorMessage, supabase } from '../../../lib/supabase'
import type { FormField } from '../../../lib/types'
import { fromLocalInput, toLocalInput } from '../../../lib/when'
import { PhotoUpload } from '../../market/EventPage'
import type { TabProps } from '../SellerEvent'
import { ErrorNote, Panel } from './shared'

export function DetailsTab({ event, refresh }: TabProps) {
  const [f, setF] = useState({
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    address: event.address,
    city: event.city,
    starts_at: toLocalInput(event.starts_at),
    ends_at: toLocalInput(event.ends_at),
    fee_bearer: event.fee_bearer,
    cover_url: event.cover_url ?? '',
  })
  const [fields, setFields] = useState<FormField[]>(event.form_fields ?? [])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const locked = event.status === 'cancelled' || event.status === 'ended'

  const save = async (e?: FormEvent, status?: 'draft' | 'published') => {
    e?.preventDefault()
    setError('')
    setSaved(false)
    const clean = fields
      .filter((x) => x.label.trim())
      .map((x, i) => ({
        id: x.id || `q${i + 1}`,
        label: x.label.trim(),
        type: x.type,
        required: x.required,
        ...(x.type === 'select' ? { options: (x.options ?? []).map((o) => o.trim()).filter(Boolean) } : {}),
      }))
    const { error: err } = await supabase
      .from('events')
      .update({
        title: f.title.trim(),
        description: f.description,
        category: f.category,
        venue: f.venue,
        address: f.address,
        city: f.city,
        starts_at: fromLocalInput(f.starts_at),
        ends_at: fromLocalInput(f.ends_at),
        fee_bearer: f.fee_bearer,
        cover_url: f.cover_url || null,
        form_fields: clean,
        ...(status ? { status } : {}),
      })
      .eq('id', event.id)
    if (err) return setError(await errorMessage(err))
    setSaved(true)
    await refresh()
  }

  return (
    <form onSubmit={save} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-7">
        <Panel title="About the event">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2">
              {(p) => <Input {...p} value={f.title} onChange={set('title')} disabled={locked} />}
            </Field>
            <Field label="Type">
              {(p) => (
                <Select {...p} value={f.category} onChange={set('category')} disabled={locked}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="City">
              {(p) => <Input {...p} value={f.city} onChange={set('city')} disabled={locked} />}
            </Field>
            <Field label="Venue">
              {(p) => <Input {...p} value={f.venue} onChange={set('venue')} disabled={locked} />}
            </Field>
            <Field label="Address">
              {(p) => <Input {...p} value={f.address} onChange={set('address')} disabled={locked} />}
            </Field>
            <Field label="Starts">
              {(p) => <Input {...p} type="datetime-local" value={f.starts_at} onChange={set('starts_at')} disabled={locked || event.status === 'postponed'} />}
            </Field>
            <Field label="Ends (optional)">
              {(p) => <Input {...p} type="datetime-local" value={f.ends_at} onChange={set('ends_at')} disabled={locked} />}
            </Field>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-[0.72rem] font-bold tracking-[0.12em] uppercase">Description</span>
              <textarea
                value={f.description}
                onChange={set('description')}
                rows={6}
                disabled={locked}
                className="rounded-md border-2 border-line-strong bg-card p-3 focus:border-ink focus:shadow-hard-sm focus:outline-none"
              />
            </label>
          </div>
        </Panel>

        <Panel title="Checkout questions">
          <p className="mb-4 text-sm font-medium text-ink-soft">Ask buyers for things like T-shirt size or dietary needs. Up to 10.</p>
          <ul className="flex flex-col gap-3">
            {fields.map((x, i) => (
              <li key={i} className="grid gap-2 rounded-md border-2 border-line-strong p-3 sm:grid-cols-[1.5fr_1fr_auto_auto] sm:items-center">
                <Input aria-label="Question" value={x.label} onChange={(e) => setFields((all) => all.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} placeholder="T-shirt size" />
                <Select aria-label="Answer type" value={x.type} onChange={(e) => setFields((all) => all.map((y, j) => (j === i ? { ...y, type: e.target.value as FormField['type'] } : y)))}>
                  <option value="text">Free text</option>
                  <option value="select">Pick one</option>
                </Select>
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={x.required} onChange={(e) => setFields((all) => all.map((y, j) => (j === i ? { ...y, required: e.target.checked } : y)))} />
                  Required
                </label>
                <button type="button" aria-label="Remove question" onClick={() => setFields((all) => all.filter((_, j) => j !== i))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2">
                  <X size={16} aria-hidden="true" />
                </button>
                {x.type === 'select' && (
                  <Input
                    aria-label="Options"
                    className="sm:col-span-4"
                    value={(x.options ?? []).join(', ')}
                    onChange={(e) => setFields((all) => all.map((y, j) => (j === i ? { ...y, options: e.target.value.split(',') } : y)))}
                    placeholder="Options, separated by commas: S, M, L, XL"
                  />
                )}
              </li>
            ))}
          </ul>
          {fields.length < 10 && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setFields((all) => [...all, { id: `q${Date.now().toString(36)}`, label: '', type: 'text', required: false }])}>
              <Plus size={15} aria-hidden="true" /> Add question
            </Button>
          )}
        </Panel>
      </div>

      <div className="flex flex-col gap-6 lg:col-span-5">
        <Panel title="Cover photo">
          <PhotoUpload value={f.cover_url || undefined} onUploaded={(u) => setF((x) => ({ ...x, cover_url: u }))} />
        </Panel>
        <Panel title="Who pays the Paystack fee?">
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Fee</legend>
            {(['buyer', 'seller'] as const).map((b) => (
              <label key={b} className={`flex cursor-pointer gap-3 rounded-md border-2 p-3 ${f.fee_bearer === b ? 'border-ink bg-danfo-soft' : 'border-line-strong'}`}>
                <input type="radio" name="fee" checked={f.fee_bearer === b} onChange={() => setF((x) => ({ ...x, fee_bearer: b }))} />
                <span>
                  <span className="block font-bold">{b === 'buyer' ? 'Buyers pay it' : 'I absorb it'}</span>
                  <span className="text-sm text-ink-soft">
                    {b === 'buyer' ? 'A small fee is added at checkout. You receive the full ticket price, minus commission.' : 'Buyers pay the ticket price only. The fee comes out of your share.'}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </Panel>
        <Panel title="Save" tone="soft">
          <ErrorNote message={error} />
          {saved && (
            <p role="status" className="mb-3 text-sm font-bold text-green">
              Saved.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="ink" disabled={locked}>
              Save changes
            </Button>
            {event.status === 'draft' && (
              <Button variant="danfo" onClick={() => void save(undefined, 'published')}>
                Save & publish
              </Button>
            )}
            {event.status === 'published' && (
              <Button variant="ghost" onClick={() => void save(undefined, 'draft')}>
                Unpublish
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </form>
  )
}
