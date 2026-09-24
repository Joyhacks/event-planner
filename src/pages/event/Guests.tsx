import { Download, Search, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, Field, Input, Pill, Select } from '../../components/ui'
import { GROUP_LABEL, RSVP_LABEL } from '../../data/catalog'
import type { GuestGroup, Rsvp } from '../../data/types'
import { downloadFile, slugify, toCsv } from '../../lib/csv'
import { guestStats } from '../../lib/stats'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

const FILTERS: { value: Rsvp | 'all'; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'yes', label: 'Coming' },
  { value: 'pending', label: 'Awaiting' },
  { value: 'maybe', label: 'Maybe' },
  { value: 'no', label: 'Not coming' },
]

const RSVP_TONE = { yes: 'palm', no: 'clay', maybe: 'ochre', pending: 'neutral' } as const

export default function Guests() {
  const { event } = useEventContext()
  const addGuest = usePlanner((s) => s.addGuest)
  const updateGuest = usePlanner((s) => s.updateGuest)
  const removeGuest = usePlanner((s) => s.removeGuest)

  const [filter, setFilter] = useState<Rsvp | 'all'>('all')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [group, setGroup] = useState<GuestGroup>('family')
  const [plusOnes, setPlusOnes] = useState('0')
  const [error, setError] = useState('')

  const stats = guestStats(event.guests)
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return event.guests.filter(
      (g) => (filter === 'all' || g.rsvp === filter) && (!q || g.name.toLowerCase().includes(q) || g.phone.includes(q)),
    )
  }, [event.guests, filter, query])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Enter a name.')
    const extra = Number(plusOnes)
    if (!Number.isInteger(extra) || extra < 0 || extra > 20) return setError('Plus-ones must be between 0 and 20.')
    addGuest(event.id, { name: name.trim(), phone: phone.trim(), group, plusOnes: extra, rsvp: 'pending' })
    setName('')
    setPhone('')
    setPlusOnes('0')
    setError('')
  }

  const exportCsv = () => {
    const rows = [
      ['Name', 'Phone', 'Group', 'RSVP', 'Plus-ones', 'Total seats'],
      ...event.guests.map((g) => [g.name, g.phone, GROUP_LABEL[g.group], RSVP_LABEL[g.rsvp], g.plusOnes, g.plusOnes + 1]),
    ]
    downloadFile(`${slugify(event.title)}-guests.csv`, toCsv(rows))
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <section aria-labelledby="add-guest" className="order-2 lg:order-none lg:col-span-4">
        <dl className="grid grid-cols-3 border-y border-line py-5 text-center">
          {[
            ['Coming', stats.coming, 'text-palm'],
            ['Awaiting', stats.pending, 'text-ink'],
            ['Declined', stats.declined, 'text-clay'],
          ].map(([label, n, tone]) => (
            <div key={label} className="flex flex-col-reverse">
              <dd className={`tabular font-serif text-4xl ${tone}`}>{n}</dd>
              <dt className="text-xs tracking-wider text-ink-faint uppercase">{label}</dt>
            </div>
          ))}
        </dl>

        <h2 id="add-guest" className="mt-10 font-serif text-3xl">Add a guest</h2>
        <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
          <Field label="Name" error={error}>
            {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Chief & Mrs Adewale" autoComplete="off" />}
          </Field>
          <Field label="Phone (optional)">
            {(p) => <Input {...p} type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0803 000 0000" />}
          </Field>
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Group">
              {(p) => (
                <Select {...p} value={group} onChange={(e) => setGroup(e.target.value as GuestGroup)}>
                  {(Object.keys(GROUP_LABEL) as GuestGroup[]).map((k) => (
                    <option key={k} value={k}>
                      {GROUP_LABEL[k]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Plus-ones">
              {(p) => <Input {...p} inputMode="numeric" value={plusOnes} onChange={(e) => setPlusOnes(e.target.value)} />}
            </Field>
          </div>
          <Button type="submit" variant="ink" className="self-start">
            Add to list
          </Button>
        </form>
      </section>

      <section aria-labelledby="guest-list" className="min-w-0 lg:col-span-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="guest-list" className="font-serif text-3xl">
            Guest list <span className="tabular text-ink-faint">({stats.heads} seats)</span>
          </h2>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!event.guests.length}>
            <Download size={15} aria-hidden="true" /> Export for the gate
          </Button>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
          <div role="group" aria-label="Filter by reply" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors ${
                  filter === f.value ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative md:ml-auto md:w-60">
            <span className="sr-only">Search guests</span>
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" className="pl-9" />
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-10 border-t border-line pt-10 text-center text-ink-soft">
            {event.guests.length === 0 ? 'No guests yet. Start with the people you cannot forget.' : 'Nobody matches that filter.'}
          </p>
        ) : (
          <ul className="mt-6 border-t border-line">
            {visible.map((g) => (
              <li key={g.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line py-4 sm:grid-cols-[1fr_9.5rem_auto]">
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {g.name}
                    {g.plusOnes > 0 && <span className="text-ink-faint"> +{g.plusOnes}</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                    <Pill tone={RSVP_TONE[g.rsvp]}>{RSVP_LABEL[g.rsvp]}</Pill>
                    {GROUP_LABEL[g.group]}
                    {g.phone && <a href={`tel:${g.phone.replace(/\s/g, '')}`} className="tabular hover:text-ink">{g.phone}</a>}
                  </p>
                </div>
                <Select
                  aria-label={`Reply from ${g.name}`}
                  value={g.rsvp}
                  onChange={(e) => updateGuest(event.id, g.id, { rsvp: e.target.value as Rsvp })}
                  className="col-span-2 row-start-2 h-10 text-sm sm:col-span-1 sm:row-start-auto"
                >
                  {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => (
                    <option key={r} value={r}>
                      {RSVP_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => removeGuest(event.id, g.id)}
                  className="col-start-2 row-start-1 grid h-10 w-10 place-items-center rounded-full text-ink-faint hover:bg-paper-2 hover:text-clay sm:col-start-auto sm:row-start-auto"
                  aria-label={`Remove ${g.name}`}
                >
                  <X size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
