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
 * Textile-inspired pattern fills drawn in SVG, so covers never need stock
 * photos. oniko = tie-dye rings, eleko = starch-resist lines and dots,
 * kente = woven strip blocks, orbit = large calabash rings.
 */
export function Motif({ kind, color, opacity = 0.35, className = '', scale = 1 }: Props) {
  const id = useId().replace(/:/g, '')
  const s = scale

  if (kind === 'orbit') {
    return (
      <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} preserveAspectRatio="xMaxYMin slice" viewBox="0 0 400 300">
        <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.5}>
          {[40, 80, 120, 160, 200, 240, 280].map((r) => (
            <circle key={r} cx={400} cy={0} r={r} />
          ))}
        </g>
        <circle cx={400} cy={0} r={18} fill={color} fillOpacity={opacity} />
      </svg>
    )
  }

  const tile = { oniko: 30, eleko: 26, kente: 44 }[kind] * s

  return (
    <svg aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          {kind === 'oniko' && (
            <g fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={1.4 * s}>
              <circle cx={tile / 2} cy={tile / 2} r={tile * 0.3} />
              <circle cx={tile / 2} cy={tile / 2} r={tile * 0.14} />
              <circle cx={tile / 2} cy={tile / 2} r={tile * 0.04} fill={color} fillOpacity={opacity} />
            </g>
          )}
          {kind === 'eleko' && (
            <g fill={color} fillOpacity={opacity}>
              <rect x={0} y={tile * 0.2} width={tile} height={1.4 * s} />
              <circle cx={tile * 0.25} cy={tile * 0.65} r={1.8 * s} />
              <circle cx={tile * 0.75} cy={tile * 0.65} r={1.8 * s} />
              <rect x={tile * 0.45} y={tile * 0.5} width={1.4 * s} height={tile * 0.3} />
            </g>
          )}
          {kind === 'kente' && (
            <g fill={color} fillOpacity={opacity}>
              <rect x={0} y={0} width={tile} height={tile * 0.14} />
              <rect x={0} y={tile * 0.5} width={tile} height={tile * 0.06} />
              <rect x={tile * 0.1} y={tile * 0.2} width={tile * 0.1} height={tile * 0.24} />
              <rect x={tile * 0.3} y={tile * 0.2} width={tile * 0.1} height={tile * 0.24} />
              <rect x={tile * 0.6} y={tile * 0.62} width={tile * 0.3} height={tile * 0.08} />
              <rect x={tile * 0.6} y={tile * 0.8} width={tile * 0.3} height={tile * 0.08} />
            </g>
          )}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
