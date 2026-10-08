import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, ConfirmButton, Field, Input, Select } from '../../components/ui'
import { VENDOR_STATUS_LABEL, VENDOR_CATEGORY_LABEL } from '../../data/catalog'
import type { VendorCategory, VendorStatus } from '../../data/types'
import { findVendor } from '../../data/vendors'
import { formatMoney, parseAmount } from '../../lib/money'
import { uid } from '../../lib/id'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function EventVendors() {
  const { event, canEdit } = useEventContext()
  const setCustom = usePlanner((s) => s.setCustomVendor)
  const setStatus = usePlanner((s) => s.setVendorStatus)
  const remove = usePlanner((s) => s.removeVendor)
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [notes, setNotes] = useState(''),
    [quote, setQuote] = useState('')
  const [category, setCategory] = useState<VendorCategory>('catering')
  const [error, setError] = useState('')
  const clear = () => {
    setEditing(null)
    setName('')
    setPhone('')
    setNotes('')
    setQuote('')
    setError('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    const amount = quote.trim() ? parseAmount(quote) : 0
    if (
      !name.trim() ||
      name.length > 120 ||
      phone.length > 30 ||
      notes.length > 1000 ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 1e12
    )
      return setError('Check the vendor details and quote amount.')
    const previous = event.vendors.find((v) => v.vendorId === editing)
    setCustom(event.id, {
      vendorId: editing ?? uid(),
      status: previous?.status ?? 'enquired',
      custom: { name: name.trim(), phone: phone.trim(), notes: notes.trim(), category, quote: amount },
    })
    clear()
  }
  return (
    <div>
      <h2 className="font-display text-2xl">Your vendors</h2>
      <p className="mt-2 text-ink-soft">
        Keep real contacts, quotes and booking progress together. Quotes here do not change your budget automatically.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {event.vendors.map((v) => {
          const demo = findVendor(v.vendorId)
          const info = v.custom
          return (
            <article key={v.vendorId} className="flex min-w-0 flex-col rounded-lg border-2 border-ink bg-card p-5">
              <p className="text-xs font-bold uppercase">
                {info ? VENDOR_CATEGORY_LABEL[info.category] : 'Demo listing'}
              </p>
              <h3 className="mt-2 break-words font-display text-xl">{info?.name ?? demo?.name ?? 'Vendor'}</h3>
              {info?.phone && (
                <a href={`tel:${info.phone.replace(/[^+\d]/g, '')}`} className="mt-3 break-words underline">
                  {info.phone}
                </a>
              )}
              <p className="mt-3 break-words text-sm text-ink-soft">{info?.notes ?? demo?.blurb}</p>
              <p className="mt-4 font-bold">
                {info ? 'Quote: ' : 'From '}
                {formatMoney(
                  info?.quote ?? demo?.priceFrom ?? 0,
                  info ? event.currency : (demo?.currency ?? event.currency),
                )}
              </p>
              <Select
                className="mt-4"
                disabled={!canEdit}
                aria-label={`Status for ${info?.name ?? demo?.name ?? 'vendor'}`}
                value={v.status}
                onChange={(e) => setStatus(event.id, v.vendorId, e.target.value as VendorStatus)}
              >
                {Object.entries(VENDOR_STATUS_LABEL).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {info && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(v.vendorId)
                        setName(info.name)
                        setPhone(info.phone)
                        setNotes(info.notes)
                        setQuote(String(info.quote))
                        setCategory(info.category)
                      }}
                    >
                      Edit vendor
                    </Button>
                  )}
                  <ConfirmButton
                    size="sm"
                    variant="ghost"
                    confirmLabel="Remove vendor?"
                    onConfirm={() => remove(event.id, v.vendorId)}
                  >
                    Remove
                  </ConfirmButton>
                </div>
              )}
            </article>
          )
        })}
      </div>
      {!event.vendors.length && <p className="mt-5">Add your venue, caterer or another supplier below.</p>}
      {canEdit && (
        <form
          onSubmit={submit}
          className="mt-10 grid max-w-3xl gap-5 rounded-lg border-2 border-ink bg-card p-6 sm:grid-cols-2"
        >
          <h2 className="font-display text-xl sm:col-span-2">{editing ? 'Edit vendor' : 'Add your own vendor'}</h2>
          <Field label="Business or vendor name">
            {(p) => <Input {...p} required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Category">
            {(p) => (
              <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as VendorCategory)}>
                {Object.entries(VENDOR_CATEGORY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Phone (optional)">
            {(p) => <Input {...p} type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          <Field label={`Quote (${event.currency})`}>
            {(p) => <Input {...p} inputMode="decimal" value={quote} onChange={(e) => setQuote(e.target.value)} />}
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            {(p) => (
              <textarea
                {...p}
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-24 rounded-md border-2 border-line-strong bg-card p-3"
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-red sm:col-span-2">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button type="submit">{editing ? 'Save vendor' : 'Add vendor'}</Button>
            {editing && (
              <Button variant="ghost" onClick={clear}>
                Cancel edit
              </Button>
            )}
          </div>
        </form>
      )}
      <Link className="mt-6 inline-block py-3 font-bold underline" to={`/app/vendors?event=${event.id}`}>
        Explore demo directory
      </Link>
    </div>
  )
}
