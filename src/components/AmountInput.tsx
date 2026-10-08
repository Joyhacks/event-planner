import { useRef, useState } from 'react'
import { parseAmount } from '../lib/money'
import { fieldClass } from './styles'

/** Inline number cell that commits on blur or Enter and reverts on bad input. */
export function AmountInput({
  value,
  onCommit,
  label,
  disabled,
}: {
  disabled?: boolean
  value: number
  onCommit: (n: number) => void
  label: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const cancelBlur = useRef(false)
  const shown = draft ?? value.toLocaleString('en-NG')

  const commit = () => {
    if (cancelBlur.current) {
      cancelBlur.current = false
      setDraft(null)
      return
    }
    if (draft === null) return
    const n = parseAmount(draft)
    if (!disabled && Number.isSafeInteger(n) && n >= 0 && n <= 1e12 && n !== value) onCommit(n)
    setDraft(null)
  }

  return (
    <input
      aria-label={label}
      disabled={disabled}
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
          cancelBlur.current = true
          setDraft(null)
          e.currentTarget.blur()
        }
      }}
      className={`${fieldClass} tabular h-12 min-w-0 border-line-strong bg-card text-right text-sm text-ink hover:border-line-strong`}
    />
  )
}
