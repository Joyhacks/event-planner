import type { ReactNode } from 'react'
import { VENDOR_CATEGORY_LABEL } from '../data/catalog'
import type { Vendor } from '../data/types'
import { formatMoney } from '../lib/money'

const TAB: Record<Vendor['category'], string> = {
  catering: 'bg-pink',
  'small-chops': 'bg-danfo',
  decor: 'bg-blue text-white',
  venue: 'bg-ink text-danfo',
  entertainment: 'bg-green text-white',
  mc: 'bg-danfo',
  media: 'bg-blue text-white',
  attire: 'bg-pink',
}

export function VendorCard({ vendor, children }: { vendor: Vendor; children?: ReactNode }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard">
      <div className={`flex items-center justify-between border-b-2 border-ink px-4 py-2 ${TAB[vendor.category]}`}>
        <p className="text-[0.7rem] font-extrabold tracking-[0.12em] uppercase">{VENDOR_CATEGORY_LABEL[vendor.category]}</p>
        <p className="tabular text-sm font-bold" aria-label={`Rated ${vendor.rating} out of 5`}>
          ★ {vendor.rating.toFixed(1)}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl leading-tight">{vendor.name}</h3>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{vendor.city}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">{vendor.blurb}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {vendor.tags.map((t) => (
            <li key={t} className="rounded-full border-[1.5px] border-ink px-2.5 py-0.5 text-xs font-semibold">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-ink-soft">
          From <span className="tabular font-sign text-base text-ink">{formatMoney(vendor.priceFrom, vendor.currency)}</span>
        </p>
        {children && <div className="mt-auto pt-5">{children}</div>}
      </div>
    </article>
  )
}
