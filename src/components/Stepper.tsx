import { Minus, Plus } from 'lucide-react'

export function Stepper({ value, max, onChange, label }: { value: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center overflow-hidden rounded-md border-2 border-ink bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center disabled:opacity-30"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label={`Fewer ${label}`}
      >
        <Minus size={16} strokeWidth={2.5} aria-hidden="true" />
      </button>
      <output className="tabular w-9 text-center font-bold" aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center disabled:opacity-30"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`More ${label}`}
      >
        <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  )
}
