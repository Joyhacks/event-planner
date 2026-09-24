import { useId } from 'react'
import type { Motif as MotifKind } from '../data/catalog'

interface Props {
  kind: MotifKind
  color: string
  opacity?: number
  className?: string
  /** Scale of the repeating tile. 1 = default density. */
  scale?: number
}

/**
 * Pattern fills drawn in SVG, so covers never need stock photos.
 * oniko = adire tie-dye rings, eleko = starch-resist lines and dots,
 * kente = woven strip blocks, orbit = calabash rings, checker = taxi check.
 */
export function Motif({ kind, color, opacity = 0.2, className = '', scale = 1 }: Props) {
  const id = useId().replace(/:/g, '')
  const s = scale

  if (kind === 'orbit') {
    return (
      <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="xMaxYMin slice" viewBox="0 0 400 300">
        <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={3}>
          {[50, 95, 140, 185, 230, 275].map((r) => (
            <circle key={r} cx={400} cy={0} r={r} />
          ))}
        </g>
        <circle cx={400} cy={0} r={24} fill={color} fillOpacity={opacity} />
      </svg>
    )
  }

  const tile = { oniko: 36, eleko: 30, kente: 48, checker: 28 }[kind] * s

  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          {kind === 'oniko' && (
            <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={2.4 * s}>
              <circle cx={tile / 2} cy={tile / 2} r={tile * 0.32} />
              <circle cx={tile / 2} cy={tile / 2} r={tile * 0.14} fill={color} fillOpacity={opacity} />
            </g>
          )}
          {kind === 'eleko' && (
            <g fill={color} fillOpacity={opacity}>
              <rect x={0} y={tile * 0.18} width={tile} height={2.6 * s} />
              <circle cx={tile * 0.25} cy={tile * 0.62} r={3 * s} />
              <circle cx={tile * 0.75} cy={tile * 0.62} r={3 * s} />
            </g>
          )}
          {kind === 'kente' && (
            <g fill={color} fillOpacity={opacity}>
              <rect x={0} y={0} width={tile} height={tile * 0.16} />
              <rect x={tile * 0.1} y={tile * 0.28} width={tile * 0.12} height={tile * 0.26} />
              <rect x={tile * 0.34} y={tile * 0.28} width={tile * 0.12} height={tile * 0.26} />
              <rect x={tile * 0.58} y={tile * 0.66} width={tile * 0.34} height={tile * 0.1} />
              <rect x={tile * 0.58} y={tile * 0.84} width={tile * 0.34} height={tile * 0.1} />
            </g>
          )}
          {kind === 'checker' && (
            <g fill={color} fillOpacity={opacity}>
              <rect x={0} y={0} width={tile / 2} height={tile / 2} />
              <rect x={tile / 2} y={tile / 2} width={tile / 2} height={tile / 2} />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
