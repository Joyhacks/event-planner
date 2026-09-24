import { Copy, MessageCircle, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input } from '../../components/ui'
import { buttonClass } from '../../components/styles'
import { FABRIC_SWATCHES } from '../../data/catalog'
import type { PlannerEvent } from '../../data/types'
import { asoebiMessage, whatsappShareUrl } from '../../lib/asoebi'
import { formatMoney, parseAmount } from '../../lib/money'
import { asoebiStats } from '../../lib/stats'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function Asoebi() {
  const { event } = useEventContext()
  const [editing, setEditing] = useState(false)
  if (!event.asoebi || editing) return <Setup event={event} onDone={() => setEditing(false)} />
  return <Ledger event={event} onEdit={() => setEditing(true)} />
}

function Setup({ event, onDone }: { event: PlannerEvent; onDone: () => void }) {
  const setAsoebi = usePlanner((s) => s.setAsoebi)
  const [fabric, setFabric] = useState(event.asoebi?.fabric ?? '')
  const [price, setPrice] = useState(event.asoebi ? event.asoebi.pricePerSet.toLocaleString('en-NG') : '')
  const [payTo, setPayTo] = useState(event.asoebi?.payTo ?? '')
  const [colors, setColors] = useState<string[]>(event.asoebi?.colors ?? [])
  const [errors, setErrors] = useState<{ fabric?: string; price?: string }>({})

  const toggle = (hex: string) =>
    setColors((c) => (c.includes(hex) ? c.filter((x) => x !== hex) : c.length < 3 ? [...c, hex] : c))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amount = parseAmount(price)
    const next = {
      fabric: fabric.trim() ? undefined : 'Describe the fabric, e.g. “Aso-oke, wine & gold”.',
      price: Number.isNaN(amount) || amount <= 0 ? 'Enter the price per set.' : undefined,
    }
    setErrors(next)
    if (next.fabric || next.price) return
    setAsoebi(event.id, { fabric: fabric.trim(), pricePerSet: amount, payTo: payTo.trim(), colors })
    onDone()
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h2 className="font-display text-3xl leading-tight">
          Set up the <em className="hl">aso-ebi.</em>
        </h2>
        <p className="mt-4 text-ink-soft">
          Pick the fabric and price once. Then track who ordered, who paid and who has collected, without digging
          through transfer screenshots.
        </p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-col gap-6 lg:col-span-7 lg:col-start-6">
        <Field label="Fabric" error={errors.fabric}>
          {(p) => <Input {...p} value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Aso-oke, indigo & gold" />}
        </Field>
        <fieldset>
          <legend className="text-[0.8rem] font-medium tracking-wide text-ink-soft uppercase">Colours (up to 3)</legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {FABRIC_SWATCHES.map((s) => {
              const on = colors.includes(s.hex)
              return (
                <button
                  key={s.hex}
                  type="button"
                  aria-pressed={on}
                  aria-label={s.name}
                  title={s.name}
                  onClick={() => toggle(s.hex)}
                  className={`h-11 w-11 rounded-full border border-ink/15 transition-transform ${on ? 'scale-110 ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'hover:scale-105'}`}
                  style={{ background: s.hex }}
                />
              )
            })}
          </div>
        </fieldset>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={`Price per set (${event.currency})`} error={errors.price}>
            {(p) => <Input {...p} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="85,000" />}
          </Field>
          <Field label="Pay to" hint="Bank, account number and name. Shared in the WhatsApp message.">
            {(p) => <Input {...p} value={payTo} onChange={(e) => setPayTo(e.target.value)} placeholder="GTBank 0123456789, A. Okafor" />}
          </Field>
        </div>
        <div className="flex gap-3">
          <Button type="submit" variant="danfo">
            Save aso-ebi
          </Button>
          {event.asoebi && (
            <Button variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function Ledger({ event, onEdit }: { event: PlannerEvent; onEdit: () => void }) {
  const addBuyer = usePlanner((s) => s.addBuyer)
  const updateBuyer = usePlanner((s) => s.updateBuyer)
  const removeBuyer = usePlanner((s) => s.removeBuyer)
  const clearAsoebi = usePlanner((s) => s.clearAsoebi)
  const [name, setName] = useState('')
  const [sets, setSets] = useState('1')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const a = event.asoebi!
  const s = asoebiStats(a)
  const money = (n: number) => formatMoney(n, event.currency)
  const message = asoebiMessage(event)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(sets)
    if (!name.trim()) return setError('Enter a name.')
    if (!Number.isInteger(n) || n < 1 || n > 50) return setError('Sets must be between 1 and 50.')
    addBuyer(event.id, { name: name.trim(), sets: n, paid: false, collected: false })
    setName('')
    setSets('1')
    setError('')
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-label="Fabric" className="grid gap-8 rounded-lg border-2 border-ink bg-card p-6 shadow-hard sm:p-8 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex -space-x-4" aria-hidden="true">
          {(a.colors.length ? a.colors : ['#d9d6cb']).map((c) => (
            <span key={c} className="h-20 w-20 rounded-full border-2 border-ink" style={{ background: c }} />
          ))}
        </div>
        <div>
          <h2 className="font-display text-3xl leading-tight">{a.fabric}</h2>
          <p className="mt-1 text-ink-soft">
            {money(a.pricePerSet)} per set{a.payTo ? ` · ${a.payTo}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={whatsappShareUrl(message)} target="_blank" rel="noreferrer" className={buttonClass('ink', 'sm')}>
            <MessageCircle size={15} aria-hidden="true" /> Share on WhatsApp
          </a>
          <Button variant="outline" size="sm" onClick={copy}>
            <Copy size={15} aria-hidden="true" /> {copied ? 'Copied' : 'Copy message'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </section>

      <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {[
          ['Sets ordered', String(s.sets)],
          ['Collected', `${s.collected} of ${s.sets}`],
          ['Received', money(s.received)],
          ['Still owed', money(s.owing)],
        ].map(([l, v], i) => (
          <div key={l} className="flex flex-col-reverse">
            <dd className={`tabular mt-1 font-sign text-[1.35rem] sm:text-2xl xl:text-[2rem] ${i === 3 && s.owing > 0 ? 'text-red' : ''}`}>{v}</dd>
            <dt className="text-[0.68rem] font-bold tracking-[0.12em] text-ink-faint uppercase">{l}</dt>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <section aria-labelledby="buyers" className="min-w-0 lg:col-span-8">
          <h2 id="buyers" className="font-display text-2xl sm:text-[1.7rem]">Buyers</h2>
          {a.buyers.length === 0 ? (
            <p className="mt-6 text-ink-soft">No orders yet. Share the message and add people as they reply.</p>
          ) : (
            <ul className="mt-5 overflow-hidden rounded-lg border-2 border-ink bg-card divide-y-2 divide-ink">
              {a.buyers.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3">
                  <div className="min-w-0 basis-[calc(100%-4.5rem)] sm:flex-1 sm:basis-auto">
                    <p className="truncate font-bold">{b.name}</p>
                    <p className="tabular text-sm text-ink-soft">
                      {b.sets} {b.sets === 1 ? 'set' : 'sets'} · {money(b.sets * a.pricePerSet)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBuyer(event.id, b.id)}
                    className="grid h-10 w-10 place-items-center rounded-full text-ink-faint hover:bg-paper-2 hover:text-red sm:order-last"
                    aria-label={`Remove ${b.name}`}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                  <Toggle checked={b.paid} onChange={(v) => updateBuyer(event.id, b.id, { paid: v })} label="Paid" name={b.name} />
                  <Toggle checked={b.collected} onChange={(v) => updateBuyer(event.id, b.id, { collected: v })} label="Collected" name={b.name} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="add-buyer" className="lg:col-span-4">
          <div className="rounded-lg border-2 border-ink bg-danfo-soft p-6">
            <h2 id="add-buyer" className="font-display text-xl">Add an order</h2>
            <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
              <Field label="Name" error={error}>
                {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Aunty Funke" />}
              </Field>
              <Field label="Sets">
                {(p) => <Input {...p} inputMode="numeric" value={sets} onChange={(e) => setSets(e.target.value)} />}
              </Field>
              <Button type="submit" className="self-start">
                Add order
              </Button>
            </form>
          </div>
          <ConfirmButton variant="ghost" size="sm" className="mt-6" confirmLabel="Remove aso-ebi and all orders?" onConfirm={() => clearAsoebi(event.id)}>
            Remove aso-ebi
          </ConfirmButton>
        </section>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label, name }: { checked: boolean; onChange: (v: boolean) => void; label: string; name: string }) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 text-sm select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={`${name}: ${label}`}
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-10 rounded-full border-2 border-ink bg-paper-2 transition-colors peer-checked:bg-green peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue after:absolute after:top-0.5 after:left-0.5 after:h-3.5 after:w-3.5 after:rounded-full after:border-2 after:border-ink after:bg-white after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className={checked ? 'text-ink' : 'text-ink-soft'}>{label}</span>
    </label>
  )
}
