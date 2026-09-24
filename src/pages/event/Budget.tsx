import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { AmountInput } from '../../components/AmountInput'
import { Button, Field, Input, Meter, Select } from '../../components/ui'
import { BUDGET_LABEL } from '../../data/catalog'
import type { BudgetCategory } from '../../data/types'
import { formatMoney, parseAmount } from '../../lib/money'
import { budgetByCategory, budgetStats } from '../../lib/stats'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function Budget() {
  const { event } = useEventContext()
  const addBudgetItem = usePlanner((s) => s.addBudgetItem)
  const updateBudgetItem = usePlanner((s) => s.updateBudgetItem)
  const removeBudgetItem = usePlanner((s) => s.removeBudgetItem)
  const updateEvent = usePlanner((s) => s.updateEvent)

  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<BudgetCategory>('catering')
  const [planned, setPlanned] = useState('')
  const [errors, setErrors] = useState<{ label?: string; planned?: string }>({})

  const money = (n: number) => formatMoney(n, event.currency)
  const s = budgetStats(event.budgetItems, event.budget)
  const byCategory = budgetByCategory(event.budgetItems)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const amount = parseAmount(planned)
    const next = {
      label: label.trim() ? undefined : 'What is this for?',
      planned: Number.isNaN(amount) || amount <= 0 ? 'Enter an amount, e.g. 250,000 or 250k.' : undefined,
    }
    setErrors(next)
    if (next.label || next.planned) return
    addBudgetItem(event.id, { label: label.trim(), category, planned: amount, paid: 0 })
    setLabel('')
    setPlanned('')
  }

  return (
    <div className="flex flex-col gap-14">
      <section aria-label="Budget summary" className="grid gap-8 border-b border-line pb-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <p className="text-xs tracking-wider text-ink-faint uppercase">Total budget</p>
          <div className="mt-1 max-w-[16rem] font-serif text-4xl [&_input]:h-auto [&_input]:px-0 [&_input]:text-left [&_input]:font-serif [&_input]:text-4xl">
            <AmountInput label="Total budget" value={event.budget} onCommit={(n) => updateEvent(event.id, { budget: n })} />
          </div>
          <p className="mt-1 text-sm text-ink-soft">{event.currency} · tap to change</p>
        </div>
        {[
          ['Planned', s.planned, s.overBudget ? 'text-clay' : ''],
          ['Paid', s.paid, 'text-palm'],
          ['Still to pay', s.outstanding, ''],
        ].map(([l, n, tone]) => (
          <div key={l as string}>
            <p className="text-xs tracking-wider text-ink-faint uppercase">{l}</p>
            <p className={`tabular mt-1 font-serif text-4xl ${tone}`}>{money(n as number)}</p>
          </div>
        ))}
        {s.overBudget && (
          <p role="status" className="rounded-xs bg-clay-soft px-4 py-3 text-sm text-clay-deep md:col-span-4">
            Planned spend is {money(-s.unallocated)} above your budget. Trim a line, or raise the ceiling if the family has agreed.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <section aria-labelledby="lines" className="min-w-0 lg:col-span-8">
          <h2 id="lines" className="font-serif text-3xl">Line items</h2>
          {event.budgetItems.length === 0 ? (
            <p className="mt-6 text-ink-soft">No costs yet. Add the venue and the caterer first; they are usually the biggest.</p>
          ) : (
            <div className="mt-5">
              <div className="hidden grid-cols-[1fr_8.5rem_8.5rem_2.5rem] gap-2 border-b border-line-strong pb-3 text-[0.7rem] tracking-wider text-ink-faint uppercase sm:grid" aria-hidden="true">
                <span>Item</span>
                <span className="pr-3 text-right">Planned</span>
                <span className="pr-3 text-right">Paid</span>
                <span />
              </div>
              <ul>
                {event.budgetItems.map((i) => (
                  <li
                    key={i.id}
                    className="grid grid-cols-2 items-center gap-x-2 border-b border-line py-3 sm:grid-cols-[1fr_8.5rem_8.5rem_2.5rem] sm:py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{i.label}</p>
                      <p className="text-sm text-ink-faint">{BUDGET_LABEL[i.category]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBudgetItem(event.id, i.id)}
                      className="grid h-10 w-10 place-items-center justify-self-end rounded-full text-ink-faint hover:bg-paper-2 hover:text-clay sm:order-last"
                      aria-label={`Remove ${i.label}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                    <label className="flex items-center gap-2 text-xs text-ink-faint sm:block">
                      <span className="sm:sr-only">Planned</span>
                      <AmountInput label={`Planned for ${i.label}`} value={i.planned} onCommit={(n) => updateBudgetItem(event.id, i.id, { planned: n })} />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-ink-faint sm:block">
                      <span className="sm:sr-only">Paid</span>
                      <AmountInput label={`Paid for ${i.label}`} value={i.paid} onCommit={(n) => updateBudgetItem(event.id, i.id, { paid: n })} />
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-10 grid gap-4 border-t border-line pt-8 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-start">
            <Field label="New item" error={errors.label}>
              {(p) => <Input {...p} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Small chops, 300 packs" />}
            </Field>
            <Field label="Category">
              {(p) => (
                <Select {...p} value={category} onChange={(e) => setCategory(e.target.value as BudgetCategory)}>
                  {(Object.keys(BUDGET_LABEL) as BudgetCategory[]).map((c) => (
                    <option key={c} value={c}>
                      {BUDGET_LABEL[c]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Planned" error={errors.planned}>
              {(p) => <Input {...p} inputMode="decimal" value={planned} onChange={(e) => setPlanned(e.target.value)} placeholder="250k" />}
            </Field>
            <Button type="submit" className="sm:mt-[1.6rem]">
              Add
            </Button>
          </form>
        </section>

        <section aria-labelledby="split" className="lg:col-span-4">
          <h2 id="split" className="font-serif text-3xl">Where it goes</h2>
          <ul className="mt-5 flex flex-col gap-5">
            {byCategory.map((c) => (
              <li key={c.category}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{BUDGET_LABEL[c.category]}</span>
                  <span className="tabular text-ink-soft">{money(c.planned)}</span>
                </div>
                <div className="mt-2">
                  <Meter value={c.paid} max={c.planned} tone="indigo" label={`${BUDGET_LABEL[c.category]} paid`} />
                </div>
                <p className="tabular mt-1 text-xs text-ink-faint">
                  {s.planned ? Math.round((c.planned / s.planned) * 100) : 0}% of plan · {money(c.paid)} paid
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
