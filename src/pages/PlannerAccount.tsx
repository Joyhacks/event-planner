import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, ConfirmButton } from '../components/ui'
import { useStorageStatus, clearUnreadableStorage } from '../lib/storageStatus'
import { buttonClass } from '../components/styles'
import { useAuth } from '../lib/authContext'
import { backendReady } from '../lib/env'
import { backupJson, MAX_BACKUP_BYTES, parseBackup } from '../lib/plannerBackup'
import { downloadFile } from '../lib/csv'
import { refreshCloud } from '../lib/plannerSync'
import { useAllEvents, usePlanner } from '../store/planner'
import { useCloudPlanner } from '../store/cloudPlanner'
import type { PlannerEvent } from '../data/types'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function PlannerAccount() {
  useDocumentTitle('Backup & account')
  const { user, signOut, error: authError } = useAuth()
  const events = useAllEvents()
  const cloud = useCloudPlanner()
  const recovery = useStorageStatus((s) => s.recovery)
  const [recoveryDownloaded, setRecoveryDownloaded] = useState(false)
  const restore = usePlanner((s) => s.restoreEvents)
  const [pending, setPending] = useState<PlannerEvent[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="font-display text-3xl sm:text-4xl">Backup & account</h1>
      {recovery && (
        <section className="mt-8 rounded-lg border-2 border-red bg-card p-6">
          <h2 className="font-display text-xl">Recover unreadable data</h2>
          <p className="mt-3">
            Your original browser data is protected from being overwritten. Download it before resetting storage, then
            restore a known backup or recover your account’s cloud version.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                downloadFile('ariya-original-data.json', recovery.raw, 'application/json')
                setRecoveryDownloaded(true)
              }}
            >
              Download original data
            </Button>
            <ConfirmButton
              disabled={!recoveryDownloaded}
              variant="outline"
              confirmLabel="Original downloaded? Reset this storage?"
              onConfirm={() => {
                try {
                  clearUnreadableStorage()
                  setMessage('Storage reset. Restore a backup below.')
                  setRecoveryDownloaded(false)
                } catch {
                  setError('Could not reset browser storage. Keep your downloaded original.')
                }
              }}
            >
              Reset unreadable storage
            </ConfirmButton>
          </div>
        </section>
      )}
      <section className="mt-8 rounded-lg border-2 border-ink bg-card p-6">
        <h2 className="font-display text-xl">Your account</h2>
        {user ? (
          <>
            <p className="mt-3 break-words">
              Signed in as {user.email}. Open an event and choose Save to account to keep it across devices.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => void refreshCloud(user.id)}>
                Refresh cloud events
              </Button>
              <Button
                variant="ghost"
                disabled={Object.values(cloud.records).some((r) => r.dirty)}
                onClick={() => {
                  void signOut().catch((e) => setError(e.message))
                }}
              >
                Sign out
              </Button>
            </div>
            {Object.values(cloud.records).some((r) => r.dirty) && (
              <p className="mt-3 text-sm">
                Resolve pending changes before signing out. If there is a conflict, download a backup from the event,
                then load the cloud version.
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mt-3">
              Device events stay in this browser. Clearing browser data can remove them. Download regular backups.
            </p>
            {backendReady && (
              <Link to="/signin?next=%2Fapp%2Faccount" className={buttonClass('ink', 'md', 'mt-4')}>
                Sign in for cloud saving
              </Link>
            )}
          </>
        )}
        {(cloud.error || error || authError) && (
          <p role="alert" className="mt-4 text-red">
            {error || cloud.error || authError}
          </p>
        )}
      </section>
      <section className="mt-8 rounded-lg border-2 border-ink bg-card p-6">
        <h2 className="font-display text-xl">Download a backup</h2>
        <p className="mt-3">
          Includes guest contacts, budgets, vendors, programmes and aso-ebi records for {events.length} events. Keep
          this file somewhere private.
        </p>
        <Button
          className="mt-4"
          disabled={!events.length}
          onClick={() =>
            downloadFile(
              `ariya-backup-${new Date().toISOString().slice(0, 10)}.json`,
              backupJson(events),
              'application/json',
            )
          }
        >
          Download planner backup
        </Button>
      </section>
      <section className="mt-8 rounded-lg border-2 border-ink bg-card p-6">
        <h2 className="font-display text-xl">Restore a backup</h2>
        <p className="mt-3">
          Restores new device copies. Existing events and shared events stay unchanged. Maximum 5 MB.
        </p>
        <label className="mt-4 block font-bold">
          Ariya backup file
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              setPending([])
              setError('')
              setMessage('')
              const file = e.target.files?.[0]
              if (!file) return
              try {
                if (file.size > MAX_BACKUP_BYTES) throw new Error('Maximum file size is 5 MB.')
                setPending(parseBackup(await file.text()))
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not read this backup.')
              }
              e.target.value = ''
            }}
          />
        </label>
        {pending.length > 0 && (
          <div className="mt-5">
            <p>
              {pending.length} events ready to restore: {pending.map((e) => e.title).join(', ')}
            </p>
            <div className="mt-3 flex gap-3">
              <Button
                onClick={() => {
                  restore(pending)
                  setMessage(`${pending.length} events restored as device copies.`)
                  setPending([])
                }}
              >
                Restore these events
              </Button>
              <Button variant="ghost" onClick={() => setPending([])}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {message && (
          <p role="status" className="mt-4 text-green">
            {message}
          </p>
        )}
      </section>
    </div>
  )
}
