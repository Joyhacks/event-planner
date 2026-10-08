import { useState } from 'react'
import type { Guest } from '../data/types'
import { downloadFile, toCsv } from '../lib/csv'
import { importGuestsCsv } from '../lib/guestImport'
import { Button } from './ui'

export function GuestImport({
  existing,
  onImport,
}: {
  existing: Guest[]
  onImport: (guests: Omit<Guest, 'id'>[]) => void
}) {
  const [source, setSource] = useState('')
  const [preview, setPreview] = useState<ReturnType<typeof importGuestsCsv> | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  return (
    <details className="mt-6 rounded-lg border-2 border-line-strong p-4">
      <summary className="cursor-pointer py-2 font-bold">Import guests from CSV</summary>
      <p className="mt-3 text-sm">
        Name is required. Optional columns: Phone, Group, RSVP, Plus-ones. Matching names and phone numbers are skipped.
      </p>
      <Button
        className="mt-3"
        variant="outline"
        size="sm"
        onClick={() =>
          downloadFile(
            'ariya-guest-template.csv',
            toCsv([
              ['Name', 'Phone', 'Group', 'RSVP', 'Plus-ones'],
              ['Example guest', '', 'Family', 'Awaiting', 0],
            ]),
          )
        }
      >
        Download template
      </Button>
      <label className="mt-4 block text-sm font-bold">
        Guest CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="mt-2 block w-full"
          onChange={async (e) => {
            setError('')
            setMessage('')
            setPreview(null)
            setSource('')
            const file = e.target.files?.[0]
            if (!file) return
            try {
              if (file.size > 2_000_000) throw new Error('Maximum CSV size is 2 MB.')
              const text = await file.text()
              setPreview(importGuestsCsv(text, existing))
              setSource(text)
            } catch (e) {
              setError((e as Error).message)
            }
            e.target.value = ''
          }}
        />
      </label>
      {preview && (
        <div className="mt-4">
          <p>
            {preview.guests.length} new entries; {preview.skipped} duplicates skipped.
          </p>
          <ul className="mt-2 text-sm">
            {preview.guests.slice(0, 5).map((g, i) => (
              <li key={i}>
                {g.name} · {g.plusOnes + 1} seats
              </li>
            ))}
          </ul>
          <Button
            className="mt-3"
            disabled={!preview.guests.length}
            onClick={() => {
              try {
                const fresh = importGuestsCsv(source, existing)
                onImport(fresh.guests)
                setMessage(`${fresh.guests.length} guest entries imported.`)
                setPreview(null)
                setSource('')
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          >
            Import these guests
          </Button>
        </div>
      )}
      {message && (
        <p className="mt-3 text-green" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-red" role="alert">
          {error}
        </p>
      )}
    </details>
  )
}
