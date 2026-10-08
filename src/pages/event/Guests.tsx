import { Download, Search, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input, Pill, Select } from '../../components/ui'
import { GROUP_LABEL, RSVP_LABEL } from '../../data/catalog'
import type { GuestGroup, Rsvp } from '../../data/types'
import { downloadFile, slugify, toCsv } from '../../lib/csv'
import { GuestImport } from '../../components/GuestImport'
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

const RSVP_TONE = { yes: 'green', no: 'red', maybe: 'danfo', pending: 'neutral' } as const

export default function Guests() {
  const { event, canEdit } = useEventContext()
  const addGuest = usePlanner((s) => s.addGuest)
  const updateGuest = usePlanner((s) => s.updateGuest)
  const removeGuest = usePlanner((s) => s.removeGuest)

  const [filter, setFilter] = useState<Rsvp | 'all'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [exportScope, setExportScope] = useState('confirmed')
  const importGuests = usePlanner((s) => s.importGuests)
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
    if (!canEdit) return
    if (!name.trim() || name.trim().length > 120) return setError('Enter a name, up to 120 characters.')
    if (phone.trim().length > 30) return setError('Phone number is too long.')
    if (!editingId && event.guests.length >= 5000) return setError('Maximum 5,000 guest entries.')
    const extra = Number(plusOnes)
    if (!Number.isInteger(extra) || extra < 0 || extra > 20) return setError('Plus-ones must be between 0 and 20.')
    if (editingId) updateGuest(event.id, editingId, { name: name.trim(), phone: phone.trim(), group, plusOnes: extra })
    else addGuest(event.id, { name: name.trim(), phone: phone.trim(), group, plusOnes: extra, rsvp: 'pending' })
    setEditingId(null)
    setName('')
    setPhone('')
    setPlusOnes('0')
    setError('')
  }

  const exportCsv = () => {
    const selected =
      exportScope === 'all'
        ? event.guests
        : exportScope === 'filtered'
          ? visible
          : event.guests.filter((g) => g.rsvp === 'yes')
    const rows = [
      ['Name', 'Phone', 'Group', 'RSVP', 'Plus-ones', 'Total seats'],
      ...selected.map((g) => [g.name, g.phone, GROUP_LABEL[g.group], RSVP_LABEL[g.rsvp], g.plusOnes, g.plusOnes + 1]),
    ]
    downloadFile(`${slugify(event.title)}-guests-${exportScope}.csv`, toCsv(rows))
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <section aria-labelledby="add-guest" className="order-2 lg:order-none lg:col-span-4">
        <dl className="grid grid-cols-2 gap-4 rounded-lg border-2 border-ink bg-card py-5 text-center shadow-hard">
          {[
            ['Coming', stats.coming, 'text-green'],
            ['Awaiting', stats.pending, 'text-ink'],
            ['Maybe', stats.maybe, 'text-ink'],
            ['Declined', stats.declined, 'text-red'],
          ].map(([label, n, tone]) => (
            <div key={label} className="flex flex-col-reverse">
              <dd className={`tabular font-sign text-4xl ${tone}`}>{n}</dd>
              <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-faint uppercase">{label}</dt>
            </div>
          ))}
        </dl>

        <fieldset disabled={!canEdit} hidden={!canEdit}>
          <h2 id="add-guest" className="mt-10 font-display text-2xl sm:text-[1.7rem]">
            {editingId ? 'Edit guest' : 'Add a guest'}
          </h2>
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            <Field label="Name" error={error}>
              {(p) => (
                <Input
                  {...p}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Chief & Mrs Adewale"
                  autoComplete="off"
                />
              )}
            </Field>
            <Field label="Phone (optional)">
              {(p) => (
                <Input
                  {...p}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0803 000 0000"
                />
              )}
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
                {(p) => (
                  <Input {...p} inputMode="numeric" value={plusOnes} onChange={(e) => setPlusOnes(e.target.value)} />
                )}
              </Field>
            </div>
            <Button type="submit" variant="ink" className="self-start">
              {editingId ? 'Save guest' : 'Add to list'}
            </Button>
            {editingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId(null)
                  setName('')
                  setPhone('')
                  setPlusOnes('0')
                  setError('')
                }}
              >
                Cancel edit
              </Button>
            )}
          </form>
          <GuestImport existing={event.guests} onImport={(guests) => importGuests(event.id, guests)} />
        </fieldset>
      </section>

      <section aria-labelledby="guest-list" className="min-w-0 lg:col-span-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="guest-list" className="font-display text-2xl sm:text-[1.7rem]">
            Guest list{' '}
            <span className="tabular text-ink-faint">
              ({stats.invites} entries · {stats.heads} seats)
            </span>
          </h2>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Export guests"
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value)}
              className="!w-auto"
            >
              <option value="confirmed">Confirmed guests only</option>
              <option value="all">All guests</option>
              <option value="filtered">Current filtered list</option>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!event.guests.length}>
              <Download size={15} aria-hidden="true" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Filter by reply" className="flex max-w-full flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`h-12 shrink-0 rounded-full px-3.5 text-sm font-bold transition-colors ${
                  filter === f.value ? 'bg-ink text-danfo' : 'text-ink-soft hover:bg-paper-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:min-w-60 sm:flex-1">
            <span className="sr-only">Search guests</span>
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or phone"
              className="pl-9"
            />
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="mt-6 rounded-lg border-2 border-dashed border-ink px-6 py-10 text-center font-medium text-ink-soft">
            {event.guests.length === 0
              ? 'No guests yet. Start with the people you cannot forget.'
              : 'Nobody matches that filter.'}
          </p>
        ) : (
          <ul className="mt-6 overflow-hidden rounded-lg border-2 border-ink bg-card divide-y-2 divide-ink">
            {visible.map((g) => (
              <li
                key={g.id}
                className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 sm:grid-cols-[1fr_9.5rem_auto]"
              >
                <div className="min-w-0">
                  <p className="break-words font-bold">
                    {g.name}
                    {g.plusOnes > 0 && <span className="text-ink-faint"> +{g.plusOnes}</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                    <Pill tone={RSVP_TONE[g.rsvp]}>{RSVP_LABEL[g.rsvp]}</Pill>
                    {GROUP_LABEL[g.group]}
                    {g.phone && (
                      <a href={`tel:${g.phone.replace(/\s/g, '')}`} className="tabular hover:text-ink">
                        {g.phone}
                      </a>
                    )}
                  </p>
                </div>
                <Select
                  aria-label={`Reply from ${g.name}`}
                  disabled={!canEdit}
                  value={g.rsvp}
                  onChange={(e) => updateGuest(event.id, g.id, { rsvp: e.target.value as Rsvp })}
                  className="col-span-2 row-start-2 h-12 text-sm sm:col-span-1 sm:row-start-auto"
                >
                  {(Object.keys(RSVP_LABEL) as Rsvp[]).map((r) => (
                    <option key={r} value={r}>
                      {RSVP_LABEL[r]}
                    </option>
                  ))}
                </Select>
                <ConfirmButton
                  variant="ghost"
                  confirmLabel="Remove?"
                  disabled={!canEdit}
                  onConfirm={() => removeGuest(event.id, g.id)}
                  className="col-start-2 row-start-1 grid min-h-12 min-w-12 place-items-center rounded-full text-ink-faint hover:bg-paper-2 hover:text-red sm:col-start-auto sm:row-start-auto"
                  aria-label={`Remove ${g.name}`}
                >
                  <X size={17} aria-hidden="true" />
                </ConfirmButton>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-self-start"
                    onClick={() => {
                      setEditingId(g.id)
                      setName(g.name)
                      setPhone(g.phone)
                      setGroup(g.group)
                      setPlusOnes(String(g.plusOnes))
                      setError('')
                      document.getElementById('add-guest')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Edit guest
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
