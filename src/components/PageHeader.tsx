import type { ReactNode } from 'react'
import { Eyebrow } from './ui'

export function PageHeader({ eyebrow, title, actions }: { eyebrow?: string; title: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="font-display mt-2 text-[2.4rem] leading-[0.95] sm:text-5xl">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
