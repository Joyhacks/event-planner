import { useState, type FormEvent } from 'react'
import { Button, ConfirmButton, Field, Input } from '../../components/ui'
import { formatDate, formatTime } from '../../lib/dates'
import { downloadFile, slugify, toCsv } from '../../lib/csv'
import { whatsappShareUrl } from '../../lib/asoebi'
import { validTime } from '../../lib/plannerBackup'
import { buttonClass } from '../../components/styles'
import { usePlanner } from '../../store/planner'
import { useEventContext } from './context'

export default function Schedule() {
  const { event, canEdit } = useEventContext()
  const add = usePlanner((s) => s.addScheduleItem)
  const update = usePlanner((s) => s.updateScheduleItem)
  const remove = usePlanner((s) => s.removeScheduleItem)
  const [editing, setEditing] = useState<string | null>(null)
  const [time, setTime] = useState(event.startTime)
  const [title, setTitle] = useState('')
  const [owner, setOwner] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const message = [
    event.title,
    `${formatDate(event.date)} · ${event.venue || event.city}`,
    '',
    ...event.schedule.map((s) => `${formatTime(s.time)} · ${s.title}${s.owner ? ` (${s.owner})` : ''}`),
  ].join('\n')
  const clear = () => {
    setEditing(null)
    setTitle('')
    setOwner('')
    setError('')
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    if (!validTime(time)) return setError('Choose a valid time.')
    if (!title.trim() || title.trim().length > 160 || owner.length > 80)
      return setError('Enter the activity (up to 160 characters) and lead (up to 80).')
    const item = { time, title: title.trim(), owner: owner.trim() }
    if (editing) update(event.id, editing, item)
    else add(event.id, item)
    clear()
  }
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <section aria-labelledby="programme" className="programme-print lg:col-span-8">
        <h2 id="programme" className="font-display text-2xl">
          Order of events
        </h2>
        <p className="mt-2 text-ink-soft">
          {event.title} · {formatDate(event.date)} · {event.venue || event.city}
        </p>
        <div className="no-print mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            Print / save PDF
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadFile(
                `${slugify(event.title)}-programme.csv`,
                toCsv([['Time', 'Activity', 'Lead'], ...event.schedule.map((s) => [s.time, s.title, s.owner])]),
              )
            }
          >
            Export CSV
          </Button>
          <a href={whatsappShareUrl(message)} target="_blank" rel="noreferrer" className={buttonClass('outline')}>
            Share on WhatsApp
          </a>
          <Button
            variant="ghost"
            onClick={() => {
              void navigator.clipboard
                .writeText(message)
                .then(() => setCopied(true))
                .catch(() => setError('Copy was unavailable. Use the text below or export the programme.'))
            }}
          >
            {copied ? 'Copied' : 'Copy programme'}
          </Button>
        </div>
        {!event.schedule.length ? (
          <p className="mt-8">Start with guest arrival and when food is served.</p>
        ) : (
          <ol className="mt-8 border-l-2 border-ink pl-6">
            {event.schedule.map((s) => (
              <li key={s.id} className="mb-7 break-inside-avoid">
                <p className="font-sign text-2xl">{formatTime(s.time)}</p>
                <p className="mt-2 font-bold">{s.title}</p>
                {s.owner && <p className="text-sm text-ink-soft">Led by {s.owner}</p>}
                {canEdit && (
                  <div className="no-print mt-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(s.id)
                        setTime(s.time)
                        setTitle(s.title)
                        setOwner(s.owner)
                      }}
                    >
                      Edit
                    </Button>
                    <ConfirmButton
                      variant="ghost"
                      size="sm"
                      confirmLabel="Remove moment?"
                      onConfirm={() => remove(event.id, s.id)}
                    >
                      Remove
                    </ConfirmButton>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
        {error && (
          <div className="no-print mt-5">
            <p role="alert" className="text-red">
              {error}
            </p>
            <textarea
              aria-label="Programme text"
              readOnly
              value={message}
              className="mt-3 h-48 w-full rounded-md border-2 p-3"
            />
          </div>
        )}
      </section>
      {canEdit && (
        <section className="no-print lg:col-span-4">
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border-2 border-ink bg-danfo-soft p-6">
            <h2 className="font-display text-xl">{editing ? 'Edit moment' : 'Add a moment'}</h2>
            <Field label="Time">
              {(p) => <Input {...p} required type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
            </Field>
            <Field label="What happens">
              {(p) => (
                <Input {...p} required maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
              )}
            </Field>
            <Field label="Who leads it (optional)">
              {(p) => <Input {...p} maxLength={80} value={owner} onChange={(e) => setOwner(e.target.value)} />}
            </Field>
            <Button type="submit">{editing ? 'Save moment' : 'Add to programme'}</Button>
            {editing && (
              <Button variant="ghost" onClick={clear}>
                Cancel edit
              </Button>
            )}
          </form>
        </section>
      )}
    </div>
  )
}
