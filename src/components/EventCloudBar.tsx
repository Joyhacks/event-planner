import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { PlannerEvent } from '../data/types'
import { useAuth } from '../lib/authContext'
import { backendReady } from '../lib/env'
import { downloadFile, slugify } from '../lib/csv'
import { backupJson } from '../lib/plannerBackup'
import { reloadCloudEvent, uploadEvent } from '../lib/plannerSync'
import { useCloudPlanner } from '../store/cloudPlanner'
import { usePlanner } from '../store/planner'
import { Button, ConfirmButton } from './ui'
import { buttonClass } from './styles'
import { useStorageStatus } from '../lib/storageStatus'

export function EventCloudBar({ event }: { event: PlannerEvent }) {
  const { user } = useAuth()
  const record = useCloudPlanner((s) => s.records[event.id])
  const storageError = useStorageStatus((s) => s.error)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const upload = async () => {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      await uploadEvent(event, user.id)
      if (useCloudPlanner.getState().userId !== user.id || !useCloudPlanner.getState().records[event.id])
        throw new Error('The account changed. Your device copy has been kept.')
      const latest = usePlanner.getState().events.find((e) => e.id === event.id)
      if (latest && latest !== event)
        useCloudPlanner.setState((s) => {
          const record = s.records[event.id]
          return record ? { records: { ...s.records, [event.id]: { ...record, event: latest, dirty: true } } } : s
        })
      usePlanner.getState().deleteEvent(event.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save to account. Device copy kept.')
    } finally {
      setBusy(false)
    }
  }
  const backup = () => downloadFile(`${slugify(event.title)}-backup.json`, backupJson([event]), 'application/json')
  return (
    <section aria-label="Event storage" className="mb-6 rounded-lg border-2 border-line-strong bg-card px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm font-medium">
          {record
            ? `${record.dirty ? 'Changes waiting to save' : 'Saved to your account'} · ${record.role === 'viewer' ? 'Read only' : record.role === 'owner' ? 'You own this event' : 'Committee editor'}`
            : storageError
              ? 'Device saving needs attention. Download a backup.'
              : 'Saved on this device only'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={backup}>
            Download backup
          </Button>
          {record ? (
            <Link to={`/app/events/${event.id}/committee`} className={buttonClass('outline', 'sm')}>
              Committee
            </Link>
          ) : (
            backendReady &&
            (user ? (
              <Button size="sm" disabled={busy} onClick={() => void upload()}>
                {busy ? 'Saving…' : 'Save to account'}
              </Button>
            ) : (
              <Link
                to={`/signin?next=${encodeURIComponent(`/app/events/${event.id}`)}`}
                className={buttonClass('ink', 'sm')}
              >
                Sign in to save online
              </Link>
            ))
          )}
        </div>
      </div>
      {(error || record?.error) && (
        <p role="alert" className="mt-3 text-sm text-red">
          {error || record?.error}
        </p>
      )}
      {record?.conflict && user && (
        <ConfirmButton
          className="mt-3"
          variant="outline"
          confirmLabel="Backup downloaded? Replace local changes?"
          onConfirm={() => {
            setError('')
            void reloadCloudEvent(event.id, user.id).catch((e) => setError(e.message))
          }}
        >
          Load cloud version
        </ConfirmButton>
      )}
    </section>
  )
}
