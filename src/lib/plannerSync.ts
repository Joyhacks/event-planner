import type { PlannerEvent } from '../data/types'
import { useCloudPlanner, type CloudRecord } from '../store/cloudPlanner'
import { parsePlannerEvent } from './plannerBackup'

const client = () => import('./supabase').then((m) => m.supabase)
const message = (e: unknown) =>
  e instanceof Error
    ? e.message
    : (e as { message?: string })?.message || 'Could not connect. Your changes remain on this device.'
const active = (userId: string) => useCloudPlanner.getState().userId === userId
const timeout = () => AbortSignal.timeout(20_000)

export async function refreshCloud(userId: string) {
  try {
    const db = await client()
    if (!active(userId)) return
    const atStart = useCloudPlanner.getState().records
    const { data, error } = await db.rpc('list_planner_snapshots').abortSignal(timeout())
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('Unexpected cloud response. Please try again.')
    if (!active(userId)) return
    const remote = data.map((raw) => ({ ...raw, event: parsePlannerEvent(raw.event), dirty: false })) as CloudRecord[]
    const current = useCloudPlanner.getState().records
    const records: Record<string, CloudRecord> = {}
    for (const record of remote) {
      const old = current[record.event.id]
      // Do not resurrect a deletion or roll back a save that completed mid-read.
      if (atStart[record.event.id] && !old) continue
      if (old && old.revision > record.revision) {
        records[record.event.id] = old
        continue
      }
      records[record.event.id] = old?.dirty
        ? {
            ...old,
            role: record.role,
            ...(record.role === 'viewer'
              ? {
                  conflict: true,
                  error: 'Your access is now read only. Download your unsynced work before loading the cloud version.',
                }
              : {}),
          }
        : record
    }
    for (const [id, record] of Object.entries(current)) {
      if (!records[id] && record.dirty)
        records[id] = {
          ...record,
          role: 'viewer',
          conflict: true,
          error: 'This event is unavailable or your access was removed. Download a backup of your unsynced work.',
        }
      else if (!records[id] && atStart[id] !== record) records[id] = record
    }
    useCloudPlanner.setState({ records, loading: false, error: '' })
  } catch (e) {
    if (active(userId)) useCloudPlanner.setState({ loading: false, error: `Cloud unavailable. ${message(e)}` })
  }
}

/** Optimistic concurrency is enforced in a single Postgres transaction. */
const pushes = new Map<string, Promise<void>>()
export function pushRecord(userId: string, id: string): Promise<void> {
  const key = `${userId}:${id}`
  const existing = pushes.get(key)
  if (existing) return existing
  const pending = saveRecord(userId, id).finally(() => pushes.delete(key))
  pushes.set(key, pending)
  return pending
}
async function saveRecord(userId: string, id: string) {
  const sent = useCloudPlanner.getState().records[id]
  if (!sent?.dirty || sent.conflict || sent.role === 'viewer') return
  try {
    const event = parsePlannerEvent(sent.event)
    const db = await client()
    if (!active(userId)) return
    const { data, error } = await db
      .rpc('save_planner_snapshot', { payload: event, expected_revision: sent.revision })
      .abortSignal(timeout())
    if (error) throw error
    if (!active(userId)) return
    useCloudPlanner.setState((s) => {
      const now = s.records[id]
      if (!now) return s
      return {
        records: {
          ...s.records,
          [id]: { ...now, revision: Number(data), dirty: now.event !== sent.event, error: undefined, conflict: false },
        },
      }
    })
  } catch (e) {
    if (!active(userId)) return
    const code = (e as { code?: string })?.code
    const conflict = code === '40001' || code === '42501' || code === '23505'
    useCloudPlanner.setState((s) => {
      const current = s.records[id]
      return current
        ? {
            records: {
              ...s.records,
              [id]: {
                ...current,
                dirty: true,
                conflict,
                error: conflict
                  ? `${message(e)} Your local work has been kept. Download it before loading the cloud version.`
                  : message(e),
              },
            },
          }
        : s
    })
  }
}

export function runCloudSync(userId: string) {
  let stopped = false
  let running = false
  const tick = async () => {
    if (stopped || running || !active(userId)) return
    running = true
    try {
      for (const id of Object.keys(useCloudPlanner.getState().records)) {
        if (stopped || !active(userId)) break
        await pushRecord(userId, id)
      }
      if (!stopped && active(userId)) await refreshCloud(userId)
    } finally {
      running = false
    }
  }
  const interval = setInterval(() => void tick(), 8000)
  const online = () => void tick()
  window.addEventListener('online', online)
  window.addEventListener('focus', online)
  void tick()
  return () => {
    stopped = true
    clearInterval(interval)
    window.removeEventListener('online', online)
    window.removeEventListener('focus', online)
  }
}

export async function uploadEvent(event: PlannerEvent, userId: string) {
  const clean = parsePlannerEvent(event)
  const db = await client()
  if (!active(userId)) throw new Error('Please sign in again.')
  const { data, error } = await db
    .rpc('save_planner_snapshot', { payload: clean, expected_revision: 0 })
    .abortSignal(timeout())
  if (error) throw new Error(message(error))
  if (!active(userId)) throw new Error('The account changed. Your device copy has been kept.')
  useCloudPlanner.setState((s) => ({
    records: { ...s.records, [event.id]: { event: clean, revision: Number(data), role: 'owner', dirty: false } },
  }))
}

export async function reloadCloudEvent(id: string, userId: string) {
  const db = await client()
  const { data, error } = await db.rpc('planner_snapshot', { target_event: id }).abortSignal(timeout())
  if (error) throw new Error(message(error))
  if (!active(userId)) return
  if (!data) throw new Error('This event is no longer available. Keep your downloaded backup.')
  const event = parsePlannerEvent(data.event)
  useCloudPlanner.setState((s) => ({
    records: { ...s.records, [id]: { ...data, event, dirty: false, error: undefined, conflict: false } },
  }))
}

export async function deleteCloudEvent(id: string) {
  const { userId, records } = useCloudPlanner.getState()
  const record = records[id]
  if (!userId || !record || record.role !== 'owner') throw new Error('Only the owner can delete this event.')
  const db = await client()
  const { error } = await db
    .rpc('delete_planner_snapshot', { target_event: id, expected_revision: record.revision })
    .abortSignal(timeout())
  if (error) throw new Error(message(error))
  if (active(userId))
    useCloudPlanner.setState((s) => {
      const records = { ...s.records }
      delete records[id]
      return { records }
    })
}
