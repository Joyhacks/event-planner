import { Link } from 'react-router-dom'

export function Logo({ to = '/', inverted = false }: { to?: string; inverted?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2" aria-label="Ariya home">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="2" fill={inverted ? '#f4eee3' : '#1f2a5a'} />
        <g fill="none" stroke="#d99a2b" strokeWidth="1.8">
          <circle cx="16" cy="16" r="10" />
          <circle cx="16" cy="16" r="5.5" />
        </g>
        <circle cx="16" cy="16" r="2.2" fill={inverted ? '#1f2a5a' : '#f4eee3'} />
      </svg>
      <span className={`font-serif text-[1.7rem] leading-none italic ${inverted ? 'text-paper' : 'text-ink'}`}>
        ariya
      </span>
    </Link>
  )
}
