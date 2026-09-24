export type Variant = 'ink' | 'danfo' | 'outline' | 'ghost' | 'white'
export type Size = 'sm' | 'md' | 'lg'

const PRESSABLE =
  'border-2 border-ink shadow-hard-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-none'

const VARIANTS: Record<Variant, string> = {
  ink: `bg-ink text-danfo ${PRESSABLE} shadow-none hover:shadow-[3px_3px_0_var(--color-danfo-deep)]`,
  danfo: `bg-danfo text-ink ${PRESSABLE}`,
  outline: `bg-card text-ink ${PRESSABLE}`,
  white: `bg-white text-ink ${PRESSABLE}`,
  ghost: 'text-ink-soft hover:bg-paper-2 hover:text-ink',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[0.82rem]',
  md: 'h-11 px-5 text-[0.92rem]',
  lg: 'h-14 px-7 text-base',
}

export function buttonClass(variant: Variant = 'ink', size: Size = 'md', extra = '') {
  return `inline-flex items-center justify-center gap-2 rounded-md font-bold [font-stretch:112%] whitespace-nowrap transition-[transform,box-shadow,background-color] duration-150 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`
}

export const fieldClass =
  'w-full h-11 rounded-md border-2 border-line-strong bg-card px-3 text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] hover:border-ink-soft focus:border-ink focus:shadow-hard-sm focus:outline-none aria-[invalid=true]:border-red'
