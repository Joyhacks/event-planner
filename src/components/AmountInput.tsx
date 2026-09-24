import { useState } from 'react'
import { parseAmount } from '../lib/money'
import { fieldClass } from './styles'

/** Inline number cell that commits on blur or Enter and reverts on bad input. */
export function AmountInput({ value, onCommit, label }: { value: number; onCommit: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? value.toLocaleString('en-NG')

  const commit = () => {
    if (draft === null) return
    const n = parseAmount(draft)
    if (!Number.isNaN(n) && n >= 0 && n !== value) onCommit(n)
    setDraft(null)
  }

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={shown}
      onFocus={(e) => {
        setDraft(String(value))
        requestAnimationFrame(() => e.target.select())
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      className={`${fieldClass} tabular h-10 min-w-0 border-transparent bg-transparent text-right text-sm text-ink hover:border-line-strong`}
    />
  )
}
