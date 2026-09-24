import type { ReactNode } from 'react'

/** A painted metal sign plate, four screws and all. */
export function Signboard({ children, className = '', tone = 'danfo' }: { children: ReactNode; className?: string; tone?: 'danfo' | 'ink' | 'pink' }) {
  const colors = { danfo: 'bg-danfo text-ink', ink: 'bg-ink text-danfo', pink: 'bg-pink text-ink' }[tone]
  const screw = tone === 'ink' ? 'bg-danfo/70' : 'bg-ink/70'
  return (
    <div className={`relative rounded-md border-2 border-ink px-5 py-5 ${colors} ${className}`}>
      {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos) => (
        <span key={pos} aria-hidden="true" className={`absolute h-1.5 w-1.5 rounded-full ${screw} ${pos}`} />
      ))}
      {children}
    </div>
  )
}
