import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Select } from '../../components/ui'
import { buttonClass } from '../../components/styles'
import { VendorCard } from '../../components/VendorCard'
import { VENDOR_STATUS_LABEL } from '../../data/catalog'
import type { VendorStatus } from '../../data/types'
import { findVendor } from '../../data/vendors'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function EventVendors() {
  const { event } = useEventContext()
  const setVendorStatus = usePlanner((s) => s.setVendorStatus)
  const removeVendor = usePlanner((s) => s.removeVendor)

  const booked = event.vendors.flatMap((b) => {
    const v = findVendor(b.vendorId)
    return v ? [{ ...b, vendor: v }] : []
  })

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl sm:text-[1.7rem]">Your vendors</h2>
          <p className="mt-1 text-ink-soft">Move each one along as you confirm, pay the deposit and settle up.</p>
        </div>
        <Link to={`/app/vendors?event=${event.id}`} className={buttonClass('outline', 'sm')}>
          Find vendors <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {booked.length === 0 ? (
        <p className="mt-8 rounded-lg border-2 border-dashed border-ink px-6 py-10 font-medium text-ink-soft">
          Nobody booked yet. Venue and caterer get taken first, especially for December dates.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {booked.map(({ vendor, status }) => (
            <VendorCard key={vendor.id} vendor={vendor}>
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`Status for ${vendor.name}`}
                  value={status}
                  onChange={(e) => setVendorStatus(event.id, vendor.id, e.target.value as VendorStatus)}
                  className="h-10 text-sm"
                >
                  {(Object.keys(VENDOR_STATUS_LABEL) as VendorStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {VENDOR_STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeVendor(event.id, vendor.id)}>
                  Remove
                </Button>
              </div>
            </VendorCard>
          ))}
        </div>
      )}
    </div>
  )
}
