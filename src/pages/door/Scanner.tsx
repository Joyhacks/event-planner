import jsQR from 'jsqr'
import { ArrowLeft, Camera, CloudOff, RefreshCw, Wifi } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RequireAuth } from '../../components/RequireAuth'
import { Button } from '../../components/ui'
import { idbGet, idbSet, sha256Hex } from '../../lib/idb'
import { decideOffline, normaliseCode, type ManifestEntry, type ScanResult } from '../../lib/scanner'
import { errorMessage, supabase } from '../../lib/supabase'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

interface Queued {
  code: string
  scanned_at: string
  device_id: string
}

interface Shown {
  result: ScanResult
  name?: string
  type?: string
  offline: boolean
  at: number
}

function deviceId(): string {
  try {
    let id = localStorage.getItem('ariya-device')
    if (!id) {
      id = `door-${crypto.randomUUID().slice(0, 8)}`
      localStorage.setItem('ariya-device', id)
    }
    return id
  } catch {
    return 'door-unknown'
  }
}

const RESULT_STYLE: Record<ScanResult, { bg: string; label: string }> = {
  admitted: { bg: 'bg-green text-white', label: 'Let them in' },
  duplicate: { bg: 'bg-red text-white', label: 'Already used' },
  void: { bg: 'bg-red text-white', label: 'Cancelled ticket' },
  unknown: { bg: 'bg-ink text-danfo', label: 'Not a ticket for this event' },
}

export default function Scanner() {
  return (
    <RequireAuth>
      <Door />
    </RequireAuth>
  )
}

function Door() {
  const { eventId = '' } = useParams()
  useDocumentTitle('Door scanner')
  const manifestKey = `manifest-${eventId}`
  const queueKey = `queue-${eventId}`
  const device = useRef(deviceId())
  const manifest = useRef(new Map<string, ManifestEntry>())
  const [manifestInfo, setManifestInfo] = useState<{ count: number; at: string } | null>(null)
  const [queue, setQueue] = useState<Queued[]>([])
  const [online, setOnline] = useState(navigator.onLine)
  const [shown, setShown] = useState<Shown | null>(null)
  const [admitted, setAdmitted] = useState(0)
  const [error, setError] = useState('')
  const [syncNote, setSyncNote] = useState('')
  const [camera, setCamera] = useState(false)
  const [manual, setManual] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const lastCode = useRef<{ code: string; at: number }>({ code: '', at: 0 })
  const [title, setTitle] = useState('')

  const saveQueue = useCallback(
    async (next: Queued[]) => {
      setQueue(next)
      await idbSet(queueKey, next)
    },
    [queueKey],
  )

  const downloadManifest = useCallback(async () => {
    setError('')
    const { data, error: err } = await supabase.rpc('scanner_manifest', { p_event: eventId })
    if (err) return setError(await errorMessage(err))
    const rows = data as ({ code_hash: string } & ManifestEntry)[]
    const map = new Map(rows.map((r) => [r.code_hash, { holder_name: r.holder_name, ticket_type: r.ticket_type, status: r.status }]))
    // Keep local admissions that have not synced yet.
    for (const [hash, entry] of manifest.current) if (entry.status === 'checked_in' && map.has(hash)) map.get(hash)!.status = 'checked_in'
    manifest.current = map
    const at = new Date().toISOString()
    await idbSet(manifestKey, { at, rows: [...map.entries()] })
    setManifestInfo({ count: map.size, at })
  }, [eventId, manifestKey])

  const sync = useCallback(async () => {
    const pending = (await idbGet<Queued[]>(queueKey)) ?? []
    if (!pending.length || !navigator.onLine) return
    const { data, error: err } = await supabase.rpc('sync_offline_scans', { p_event: eventId, p_scans: pending })
    if (err) return setSyncNote(`Sync failed: ${await errorMessage(err)}`)
    const results = data as { result: ScanResult }[]
    const clashes = results.filter((r) => r.result !== 'admitted').length
    await saveQueue([])
    setSyncNote(clashes ? `Synced ${results.length} offline scans. ${clashes} had already been used at another door.` : `Synced ${results.length} offline scans.`)
  }, [eventId, queueKey, saveQueue])

  // Load cached manifest and queue, then refresh when online.
  useEffect(() => {
    void (async () => {
      const cached = await idbGet<{ at: string; rows: [string, ManifestEntry][] }>(manifestKey)
      if (cached) {
        manifest.current = new Map(cached.rows)
        setManifestInfo({ count: cached.rows.length, at: cached.at })
      }
      setQueue((await idbGet<Queued[]>(queueKey)) ?? [])
      const { data } = await supabase.from('events').select('title').eq('id', eventId).maybeSingle()
      setTitle(data?.title ?? '')
      if (navigator.onLine) {
        await sync()
        await downloadManifest()
      }
    })()
  }, [eventId, manifestKey, queueKey, downloadManifest, sync])

  useEffect(() => {
    const up = () => {
      setOnline(true)
      void sync().then(downloadManifest)
    }
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [sync, downloadManifest])

  const show = (s: Omit<Shown, 'at'>) => {
    setShown({ ...s, at: Date.now() })
    if (s.result === 'admitted') setAdmitted((n) => n + 1)
    try {
      navigator.vibrate?.(s.result === 'admitted' ? 80 : [80, 60, 80, 60, 200])
    } catch {
      /* no vibration support */
    }
  }

  const handle = useCallback(
    async (raw: string) => {
      const code = normaliseCode(raw)
      if (!code) return show({ result: 'unknown', offline: !navigator.onLine })
      const now = Date.now()
      if (lastCode.current.code === code && now - lastCode.current.at < 3000) return
      lastCode.current = { code, at: now }
      const hash = await sha256Hex(code)

      if (navigator.onLine) {
        const { data, error: err } = await supabase.rpc('check_in_ticket', { p_event: eventId, p_code: code, p_device: device.current })
        if (!err) {
          const r = data as { result: ScanResult; holder_name?: string; ticket_type?: string }
          const local = manifest.current.get(hash)
          if (local && (r.result === 'admitted' || r.result === 'duplicate')) local.status = 'checked_in'
          return show({ result: r.result, name: r.holder_name, type: r.ticket_type, offline: false })
        }
        if (err.message && !/fetch|network/i.test(err.message)) {
          setError(err.message)
          return
        }
      }
      // Offline: decide from the downloaded list, queue for sync.
      const decision = decideOffline(manifest.current, hash)
      if (decision.result === 'admitted') {
        await saveQueue([...((await idbGet<Queued[]>(queueKey)) ?? []), { code, scanned_at: new Date().toISOString(), device_id: device.current }])
        await idbSet(manifestKey, { at: manifestInfo?.at ?? new Date().toISOString(), rows: [...manifest.current.entries()] })
      }
      show({ result: decision.result, name: decision.entry?.holder_name, type: decision.entry?.ticket_type, offline: true })
    },
    [eventId, manifestInfo, manifestKey, queueKey, saveQueue],
  )

  // Camera loop.
  useEffect(() => {
    if (!camera) return
    let stream: MediaStream | null = null
    let timer = 0
    let stopped = false
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (stopped || !video.current) return
        video.current.srcObject = stream
        await video.current.play()
        const tick = () => {
          const v = video.current
          const c = canvas.current
          if (v && c && v.readyState >= 2) {
            const w = 480
            const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360
            c.width = w
            c.height = h
            const ctx = c.getContext('2d', { willReadFrequently: true })!
            ctx.drawImage(v, 0, 0, w, h)
            const found = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })
            if (found?.data) void handle(found.data)
          }
          timer = window.setTimeout(tick, 220)
        }
        tick()
      } catch {
        setError('Camera blocked. Allow camera access in your browser settings, or type the code below.')
        setCamera(false)
      }
    })()
    return () => {
      stopped = true
      clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [camera, handle])

  const submitManual = (e: FormEvent) => {
    e.preventDefault()
    void handle(manual)
    setManual('')
  }

  const style = shown ? RESULT_STYLE[shown.result] : null

  return (
    <div className="min-h-screen bg-ink text-white">
      <header className="flex items-center justify-between gap-3 border-b-2 border-danfo px-4 py-3">
        <Link to={`/seller/events/${eventId}?tab=door`} className="inline-flex items-center gap-1 text-sm font-bold text-danfo">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <p className="truncate font-bold">{title || 'Door scanner'}</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${online ? 'bg-green' : 'bg-red'}`} role="status">
          {online ? <Wifi size={13} aria-hidden="true" /> : <CloudOff size={13} aria-hidden="true" />} {online ? 'Online' : 'Offline'}
        </span>
      </header>

      <div className="mx-auto max-w-md px-4 py-5">
        <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-danfo bg-black">
          <video ref={video} playsInline muted className={`h-full w-full object-cover ${camera ? '' : 'hidden'}`} />
          {!camera && (
            <button type="button" onClick={() => setCamera(true)} className="absolute inset-0 grid place-items-center text-danfo">
              <span className="flex flex-col items-center gap-3 font-bold">
                <Camera size={40} aria-hidden="true" /> Start camera
              </span>
            </button>
          )}
          <div aria-hidden="true" className="pointer-events-none absolute inset-10 rounded-lg border-4 border-dashed border-danfo/60" />
          <canvas ref={canvas} className="hidden" />
        </div>

        <div aria-live="assertive" className="mt-4 min-h-[7.5rem]">
          {shown && style && (
            <div key={shown.at} className={`rounded-lg border-2 border-white p-5 ${style.bg}`}>
              <p className="font-sign text-3xl leading-none">{style.label}</p>
              {shown.name && <p className="mt-2 text-lg font-bold">{shown.name}</p>}
              {shown.type && <p className="text-sm font-semibold opacity-90">{shown.type}</p>}
              {shown.offline && <p className="mt-1 text-xs font-bold opacity-80">Checked offline · will sync</p>}
            </div>
          )}
        </div>

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <label className="sr-only" htmlFor="manual">
            Ticket code
          </label>
          <input
            id="manual"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type the ticket code"
            autoComplete="off"
            className="h-11 flex-1 rounded-md border-2 border-danfo bg-ink px-3 font-mono text-white placeholder:text-white/40"
          />
          <Button type="submit" variant="danfo">
            Check
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-md bg-red px-3 py-2 text-sm font-bold">
            {error}
          </p>
        )}

        <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border-2 border-white/30 p-3">
            <dd className="font-sign text-2xl text-danfo">{admitted}</dd>
            <dt className="text-xs font-bold text-white/70">Admitted here</dt>
          </div>
          <div className="rounded-md border-2 border-white/30 p-3">
            <dd className="font-sign text-2xl text-danfo">{queue.length}</dd>
            <dt className="text-xs font-bold text-white/70">Waiting to sync</dt>
          </div>
          <div className="rounded-md border-2 border-white/30 p-3">
            <dd className="font-sign text-2xl text-danfo">{manifestInfo?.count ?? 0}</dd>
            <dt className="text-xs font-bold text-white/70">On guest list</dt>
          </div>
        </dl>
        <p className="mt-3 text-center text-xs text-white/60">
          {manifestInfo ? `Guest list saved on this phone at ${new Date(manifestInfo.at).toLocaleTimeString('en-NG')}.` : 'Download the guest list before doors open.'}
        </p>
        {syncNote && <p className="mt-2 text-center text-sm font-bold text-danfo">{syncNote}</p>}
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="white" size="sm" onClick={() => void sync().then(downloadManifest)} disabled={!online}>
            <RefreshCw size={14} aria-hidden="true" /> Sync now
          </Button>
        </div>
      </div>
    </div>
  )
}
