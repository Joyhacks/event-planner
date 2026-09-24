import { Link } from 'react-router-dom'

/** Wordmark: signboard lettering on a yellow plate with two danfo stripes. */
export function Logo({ to = '/', inverted = false }: { to?: string; inverted?: boolean }) {
  return (
    <Link to={to} className="group inline-flex items-center" aria-label="Ariya home">
      <span
        className={`relative inline-flex h-9 items-center overflow-hidden rounded-sm border-2 px-2.5 pb-1.5 ${
          inverted ? 'border-danfo bg-ink text-danfo' : 'border-ink bg-danfo text-ink'
        }`}
      >
        <span className="font-sign text-[1.15rem] leading-none">ARIYA</span>
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 bottom-[3px] h-[3px] ${inverted ? 'bg-danfo' : 'bg-ink'}`}
        />
      </span>
    </Link>
  )
}
