import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { buttonClass, fieldClass, type Size, type Variant } from './styles'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'ink', size = 'md', className = '', type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />
}

/** Destructive action that asks once inline instead of a browser confirm(). */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = 'Sure? Tap again',
  className = '',
  ...rest
}: Omit<ButtonProps, 'onClick'> & { onConfirm: () => void; confirmLabel?: string }) {
  const [armed, setArmed] = useState(false)
  return (
    <Button
      {...rest}
      className={`${armed ? '!bg-red !text-white' : ''} ${className}`}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </Button>
  )
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  className?: string
}

/** Label, control, hint and error wired together with ids for screen readers. */
export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId()
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[0.72rem] font-bold tracking-[0.12em] text-ink uppercase">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-red" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${fieldClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2012%208'%3E%3Cpath%20d='M1%201l5%205%205-5'%20fill='none'%20stroke='%230e0e0e'%20stroke-width='2'/%3E%3C/svg%3E")] bg-[length:10px] bg-[right_0.9rem_center] bg-no-repeat pr-9 ${props.className ?? ''}`}
    />
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-[0.72rem] font-bold tracking-[0.16em] text-ink-soft uppercase ${className}`}>{children}</p>
}

type Tone = 'neutral' | 'green' | 'red' | 'danfo' | 'blue' | 'pink'

const TONES: Record<Tone, string> = {
  neutral: 'bg-paper-2 text-ink-soft border-line-strong',
  green: 'bg-green-soft text-green border-green',
  red: 'bg-red-soft text-red border-red',
  danfo: 'bg-danfo-soft text-ink border-danfo-deep',
  blue: 'bg-blue-soft text-blue border-blue',
  pink: 'bg-pink-soft text-ink border-pink',
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full border-[1.5px] px-2.5 text-[0.72rem] font-bold ${TONES[tone]}`}>
      {children}
    </span>
  )
}

type MeterTone = 'ink' | 'green' | 'danfo' | 'red' | 'pink' | 'blue'

/** Chunky progress bar. `value` and `max` are raw numbers. */
export function Meter({ value, max, tone = 'ink', label }: { value: number; max: number; tone?: MeterTone; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill = { ink: 'bg-ink', green: 'bg-green', danfo: 'bg-danfo', red: 'bg-red', pink: 'bg-pink', blue: 'bg-blue' }[tone]
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-white"
    >
      <div className={`h-full ${fill} ${pct > 0 && pct < 100 ? 'border-r-2 border-ink' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Rotated signboard sticker. */
export function Sticker({
  children,
  className = '',
  tone = 'pink',
  shape = 'pill',
}: {
  children: ReactNode
  className?: string
  tone?: 'pink' | 'danfo' | 'white' | 'green' | 'ink'
  shape?: 'pill' | 'round'
}) {
  const colors = {
    pink: 'bg-pink text-ink',
    danfo: 'bg-danfo text-ink',
    white: 'bg-white text-ink',
    green: 'bg-green text-white',
    ink: 'bg-ink text-danfo',
  }[tone]
  const box = shape === 'round' ? 'grid aspect-square place-items-center rounded-full p-3 text-center' : 'inline-flex items-center rounded-full px-4 py-2'
  return (
    <span className={`font-sign border-2 border-ink leading-none shadow-hard-sm ${colors} ${box} ${className}`}>{children}</span>
  )
}
