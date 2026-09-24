import { useRef, useState, type FormEvent } from 'react'
import { CITIES, CURRENCIES, EVENT_TYPES } from '../data/catalog'
import type { Currency, EventType } from '../data/types'
import type { NewEventInput } from '../store/planner'
import { validateEventForm, type EventFormErrors, type EventFormValues } from '../lib/eventForm'
import { Motif } from './Motif'
import { Button, Field, Input, Select } from './ui'

interface Props {
  initial: EventFormValues
  submitLabel: string
  allowPast?: boolean
  onSubmit: (input: NewEventInput) => void
  onCancel?: () => void
}

export function EventForm({ initial, submitLabel, allowPast, onSubmit, onCancel }: Props) {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const formRef = useRef<HTMLFormElement>(null)

  const set = <K extends keyof EventFormValues>(key: K, value: EventFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const result = validateEventForm(values, { allowPast })
    setErrors(result.errors)
    if (result.input) onSubmit(result.input)
    else requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      <fieldset>
        <legend className="text-[0.72rem] font-bold tracking-[0.12em] uppercase">What are we celebrating?</legend>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {(Object.keys(EVENT_TYPES) as EventType[]).map((key) => {
            const meta = EVENT_TYPES[key]
            const checked = values.type === key
            return (
              <label
                key={key}
                className={`group relative flex h-24 cursor-pointer flex-col justify-end overflow-hidden rounded-md border-2 border-ink p-3 transition-[transform,box-shadow] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue ${
                  checked ? '-translate-x-0.5 -translate-y-0.5 shadow-hard' : 'hover:shadow-hard-sm'
                }`}
                style={{ background: meta.bg, color: meta.fg }}
              >
                <Motif kind={meta.motif} color={meta.accent} opacity={0.14} />
                {checked && (
                  <span aria-hidden="true" className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full border-2 border-ink bg-white text-xs font-black text-ink">
                    ✓
                  </span>
                )}
                <input
                  type="radio"
                  name="type"
                  value={key}
                  checked={checked}
                  onChange={() => set('type', key)}
                  className="sr-only"
                />
                <span className="relative text-sm leading-tight font-extrabold">{meta.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Event name" error={errors.title} className="sm:col-span-2">
          {(p) => (
            <Input {...p} value={values.title} onChange={(e) => set('title', e.target.value)} placeholder="Adaeze & Tobi" autoComplete="off" />
          )}
        </Field>
        <Field label="Hosted by" hint="Optional. Shows on your plan, e.g. “The Okafor family”." className="sm:col-span-2">
          {(p) => <Input {...p} value={values.hosts} onChange={(e) => set('hosts', e.target.value)} />}
        </Field>
        <Field label="Date" error={errors.date}>
          {(p) => <Input {...p} type="date" value={values.date} onChange={(e) => set('date', e.target.value)} />}
        </Field>
        <Field label="Start time" error={errors.startTime}>
          {(p) => <Input {...p} type="time" value={values.startTime} onChange={(e) => set('startTime', e.target.value)} />}
        </Field>
        <Field label="Venue" hint="You can leave this blank until it’s booked.">
          {(p) => <Input {...p} value={values.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Hall, house or garden" />}
        </Field>
        <Field label="City" error={errors.city}>
          {(p) => (
            <>
              <Input {...p} list="city-list" value={values.city} onChange={(e) => set('city', e.target.value)} autoComplete="address-level2" />
              <datalist id="city-list">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Field>
      </div>

      <div className="grid gap-6 border-t-2 border-ink pt-8 sm:grid-cols-3">
        <Field label="Currency">
          {(p) => (
            <Select {...p} value={values.currency} onChange={(e) => set('currency', e.target.value as Currency)}>
              {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Total budget" error={errors.budget} hint="e.g. 12,000,000 or 12m">
          {(p) => <Input {...p} inputMode="decimal" value={values.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0" />}
        </Field>
        <Field label="Expected guests" error={errors.guestTarget}>
          {(p) => <Input {...p} inputMode="numeric" value={values.guestTarget} onChange={(e) => set('guestTarget', e.target.value)} placeholder="300" />}
        </Field>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="danfo" size="lg">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="lg" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
