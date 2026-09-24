import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { Button, Input, Select } from '../components/ui'
import { VendorCard } from '../components/VendorCard'
import { VENDOR_CATEGORY_LABEL } from '../data/catalog'
import type { VendorCategory } from '../data/types'
import { VENDORS } from '../data/vendors'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { usePlanner } from '../store/planner'

const CITY_OPTIONS = [...new Set(VENDORS.map((v) => v.city))].sort()

export default function Vendors() {
  useDocumentTitle('Vendors')
  const [params, setParams] = useSearchParams()
  const events = usePlanner((s) => s.events)
  const setVendorStatus = usePlanner((s) => s.setVendorStatus)

  const [query, setQuery] = useState('')
  const category = (params.get('category') as VendorCategory | null) ?? null
  const city = params.get('city') ?? ''
  const eventParam = params.get('event')
  const [targetId, setTargetId] = useState(() =>
    events.some((e) => e.id === eventParam) ? eventParam! : (events[0]?.id ?? ''),
  )
  const target = events.find((e) => e.id === targetId)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return VENDORS.filter(
      (v) =>
        (!category || v.category === category) &&
        (!city || v.city === city) &&
        (!q || `${v.name} ${v.blurb} ${v.tags.join(' ')}`.toLowerCase().includes(q)),
    )
  }, [query, category, city])

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-8 sm:px-8 lg:pt-12">
      <PageHeader eyebrow="Directory" title={<>Vendors who <em className="text-clay">show up.</em></>} />
      <p className="mt-4 max-w-2xl text-sm text-ink-soft">
        Demo listings for trying out the planner. Vendor sign-up and verified reviews are on the way.
      </p>

      <div className="mt-10 flex flex-col gap-4 border-y border-line py-5">
        <div role="group" aria-label="Filter by category" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {[null, ...(Object.keys(VENDOR_CATEGORY_LABEL) as VendorCategory[])].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              aria-pressed={category === c}
              onClick={() => setParam('category', c)}
              className={`h-9 shrink-0 rounded-full px-3.5 text-sm transition-colors ${
                category === c ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2'
              }`}
            >
              {c ? VENDOR_CATEGORY_LABEL[c] : 'All'}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_16rem]">
          <label className="relative">
            <span className="sr-only">Search vendors</span>
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jollof, gele, amapiano…" className="pl-9" />
          </label>
          <Select aria-label="City" value={city} onChange={(e) => setParam('city', e.target.value || null)}>
            <option value="">All cities</option>
            {CITY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          {events.length > 0 && (
            <Select aria-label="Add vendors to event" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  Adding to: {e.title}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <p className="tabular mt-6 text-sm text-ink-faint" aria-live="polite">
        {list.length} {list.length === 1 ? 'vendor' : 'vendors'}
      </p>

      {list.length === 0 ? (
        <p className="mt-10 text-ink-soft">No vendors match. Try another city or clear the search.</p>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((v) => {
            const added = target?.vendors.some((b) => b.vendorId === v.id)
            return (
              <VendorCard key={v.id} vendor={v}>
                {target ? (
                  added ? (
                    <p className="flex h-9 items-center gap-2 text-sm text-palm">
                      <Check size={16} aria-hidden="true" /> On {target.title}’s list
                    </p>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setVendorStatus(target.id, v.id, 'enquired')}>
                      Add to {target.title}
                    </Button>
                  )
                ) : (
                  <p className="text-sm text-ink-faint">Create an event to start shortlisting.</p>
                )}
              </VendorCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
