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
      className={`${armed ? '!bg-clay !text-card' : ''} ${className}`}
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
      <label htmlFor={id} className="text-[0.8rem] font-medium tracking-wide text-ink-soft uppercase">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-clay" role="alert">
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
      className={`${fieldClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2012%208'%3E%3Cpath%20d='M1%201l5%205%205-5'%20fill='none'%20stroke='%231b1612'%20stroke-width='1.5'/%3E%3C/svg%3E")] bg-[length:10px] bg-[right_0.9rem_center] bg-no-repeat pr-9 ${props.className ?? ''}`}
    />
  )
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[0.72rem] font-semibold tracking-[0.18em] text-ink-soft uppercase ${className}`}>{children}</p>
  )
}

type Tone = 'neutral' | 'palm' | 'clay' | 'ochre' | 'indigo'

const TONES: Record<Tone, string> = {
  neutral: 'bg-paper-2 text-ink-soft',
  palm: 'bg-palm-soft text-palm',
  clay: 'bg-clay-soft text-clay-deep',
  ochre: 'bg-ochre-soft text-ink',
  indigo: 'bg-indigo-soft text-indigo',
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  )
}

/** Thin two-colour bar. `value` and `max` are raw numbers. */
export function Meter({ value, max, tone = 'indigo', label }: { value: number; max: number; tone?: 'indigo' | 'clay' | 'palm' | 'ochre'; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const fill = { indigo: 'bg-indigo', clay: 'bg-clay', palm: 'bg-palm', ochre: 'bg-ochre' }[tone]
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-1.5 w-full overflow-hidden rounded-full bg-paper-2"
    >
      <div className={`h-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
