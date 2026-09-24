import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button, Field, Input } from '../../components/ui'
import { formatTime } from '../../lib/dates'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function Schedule() {
  const { event } = useEventContext()
  const addScheduleItem = usePlanner((s) => s.addScheduleItem)
  const removeScheduleItem = usePlanner((s) => s.removeScheduleItem)
  const [time, setTime] = useState(event.startTime)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setError('What happens at this time?')
    addScheduleItem(event.id, { time, title: title.trim(), owner: owner.trim() })
    setTitle('')
    setOwner('')
    setError('')
  }

  return (
    <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
      <section aria-labelledby="programme" className="lg:col-span-7">
        <h2 id="programme" className="font-serif text-3xl">Order of events</h2>
        <p className="mt-1 text-ink-soft">Share this with the MC, DJ and caterer so everyone moves together.</p>
        {event.schedule.length === 0 ? (
          <p className="mt-10 text-ink-soft">Nothing yet. Start with when guests arrive and when food is served.</p>
        ) : (
          <ol className="relative mt-10 border-l-2 border-line pl-8">
            {event.schedule.map((s) => (
              <li key={s.id} className="group relative pb-9 last:pb-0">
                <span className="absolute top-2 -left-[2.45rem] h-3.5 w-3.5 rounded-full border-2 border-paper bg-clay" aria-hidden="true" />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="tabular font-serif text-3xl leading-none">{formatTime(s.time)}</p>
                    <p className="mt-2 text-lg">{s.title}</p>
                    {s.owner && <p className="text-sm text-ink-faint">Led by {s.owner}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeScheduleItem(event.id, s.id)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-faint hover:bg-paper-2 hover:text-clay"
                    aria-label={`Remove ${s.title}`}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="add-moment" className="lg:col-span-4 lg:col-start-9">
        <div className="bg-paper-2 p-6">
          <h2 id="add-moment" className="font-serif text-2xl">Add a moment</h2>
          <form onSubmit={submit} noValidate className="mt-5 flex flex-col gap-4">
            <Field label="Time">
              {(p) => <Input {...p} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
            </Field>
            <Field label="What happens" error={error}>
              {(p) => <Input {...p} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cutting of the cake" />}
            </Field>
            <Field label="Who leads it (optional)">
              {(p) => <Input {...p} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="MC" />}
            </Field>
            <Button type="submit" className="self-start">
              Add to programme
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
