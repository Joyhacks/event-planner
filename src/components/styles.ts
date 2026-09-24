export type Variant = 'ink' | 'clay' | 'outline' | 'ghost' | 'paper'
export type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  ink: 'bg-ink text-paper hover:bg-indigo-deep',
  clay: 'bg-clay text-card hover:bg-clay-deep',
  outline: 'border border-ink/80 text-ink hover:bg-ink hover:text-paper',
  ghost: 'text-ink-soft hover:text-ink hover:bg-paper-2',
  paper: 'bg-paper text-ink hover:bg-card',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-13 px-7 text-base',
}

export function buttonClass(variant: Variant = 'ink', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`
}

export const fieldClass =
  'w-full h-11 rounded-xs border border-line-strong bg-card px-3 text-ink placeholder:text-ink-faint transition-colors hover:border-ink-soft focus:border-indigo focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-indigo aria-[invalid=true]:border-clay'

