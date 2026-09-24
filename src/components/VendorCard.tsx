import type { ReactNode } from 'react'
import { VENDOR_CATEGORY_LABEL } from '../data/catalog'
import type { Vendor } from '../data/types'
import { formatMoney } from '../lib/money'

const STRIPE: Record<Vendor['category'], string> = {
  catering: 'bg-clay',
  'small-chops': 'bg-ochre',
  decor: 'bg-indigo',
  venue: 'bg-ink',
  entertainment: 'bg-palm',
  mc: 'bg-clay-deep',
  media: 'bg-indigo-deep',
  attire: 'bg-ochre',
}

export function VendorCard({ vendor, children }: { vendor: Vendor; children?: ReactNode }) {
  return (
    <article className="flex flex-col border border-line bg-card">
      <div className={`h-1.5 ${STRIPE[vendor.category]}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">
            {VENDOR_CATEGORY_LABEL[vendor.category]} · {vendor.city}
          </p>
          <p className="tabular shrink-0 text-sm" aria-label={`Rated ${vendor.rating} out of 5`}>
            ★ {vendor.rating.toFixed(1)}
          </p>
        </div>
        <h3 className="mt-3 font-serif text-[1.7rem] leading-tight">{vendor.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{vendor.blurb}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {vendor.tags.map((t) => (
            <li key={t} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-sm text-ink-soft">
          From <span className="tabular font-semibold text-ink">{formatMoney(vendor.priceFrom, vendor.currency)}</span>
        </p>
        {children && <div className="mt-5 border-t border-line pt-4">{children}</div>}
      </div>
    </article>
  )
}
