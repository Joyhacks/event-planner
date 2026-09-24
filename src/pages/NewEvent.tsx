import { useNavigate } from 'react-router-dom'
import { EventForm } from '../components/EventForm'
import { PageHeader } from '../components/PageHeader'
import { emptyEventForm } from '../lib/eventForm'
import { useDocumentTitle } from '../lib/useDocumentTitle'
import { usePlanner } from '../store/planner'

export default function NewEvent() {
  useDocumentTitle('New event')
  const createEvent = usePlanner((s) => s.createEvent)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-[1180px] px-5 pt-8 sm:px-8 lg:pt-12">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <PageHeader eyebrow="New event" title={<>Let’s set the <em className="hl">date.</em></>} />
          <p className="mt-6 max-w-xs text-ink-soft">
            Only the name, date and city are required. Budget and guest numbers can be rough; you will refine them as
            quotes come in.
          </p>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <EventForm
            initial={emptyEventForm()}
            submitLabel="Create event"
            onSubmit={(input) => navigate(`/app/events/${createEvent(input)}`, { replace: true })}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </div>
  )
}
