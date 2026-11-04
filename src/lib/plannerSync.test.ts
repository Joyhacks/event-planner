import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSampleEvent } from '../data/sample'
import { changeCloudEvent, openCloudCache, useCloudPlanner } from '../store/cloudPlanner'
import { pushRecord, refreshCloud } from './plannerSync'
import { safeStorage, preserveUnreadableStorage, useStorageStatus } from './storageStatus'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: { rpc } }))
const event = createSampleEvent()
const record = () => ({ event: structuredClone(event), revision: 3, role: 'owner' as const, dirty: true })
beforeEach(() => {
  const values = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  })
  useStorageStatus.setState({ error: '', recovery: null })
  useCloudPlanner.setState({ userId: 'alice', records: { [event.id]: record() }, loading: false, error: '' })
  rpc.mockReset()
})
const response = (data: unknown, error: unknown = null) =>
  rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data, error }) })

describe('cloud saving', () => {
  it('acknowledges only the version sent and keeps edits made during the request', async () => {
    response(10)
    const pending = pushRecord('alice', event.id)
    changeCloudEvent(event.id, (e) => ({ ...e, title: 'Newer local edit' }))
    await pending
    expect(useCloudPlanner.getState().records[event.id]).toMatchObject({
      revision: 10,
      dirty: true,
      event: { title: 'Newer local edit' },
    })
  })
  it('deduplicates concurrent saves from remounts or reconnects', async () => {
    response(10)
    const first = pushRecord('alice', event.id)
    const second = pushRecord('alice', event.id)
    expect(first).toBe(second)
    await first
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(useCloudPlanner.getState().records[event.id]?.dirty).toBe(false)
  })
  it('preserves unsynced work after a revision conflict and prevents silent retries', async () => {
    response(null, { code: '40001', message: 'Another editor saved.' })
    await pushRecord('alice', event.id)
    expect(useCloudPlanner.getState().records[event.id]).toMatchObject({
      dirty: true,
      conflict: true,
      event: { title: event.title },
    })
    await pushRecord('alice', event.id)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
  it('does not cross account boundaries after sign-out', async () => {
    response(10)
    const pending = pushRecord('alice', event.id)
    openCloudCache('bob')
    await pending
    expect(useCloudPlanner.getState()).toMatchObject({ userId: 'bob', records: {} })
    expect(rpc).not.toHaveBeenCalled()
  })
  it('retains a recoverable copy when access is removed while changes are pending', async () => {
    response([])
    await refreshCloud('alice')
    expect(useCloudPlanner.getState().records[event.id]).toMatchObject({ dirty: true, conflict: true, role: 'viewer' })
    changeCloudEvent(event.id, (e) => ({ ...e, title: 'Forbidden' }))
    expect(useCloudPlanner.getState().records[event.id]?.event.title).toBe(event.title)
  })
  it('does not overwrite local edits with a refreshed server snapshot', async () => {
    response([{ ...record(), event: { ...event, title: 'Remote title' }, revision: 4 }])
    await refreshCloud('alice')
    expect(useCloudPlanner.getState().records[event.id]?.event.title).toBe(event.title)
  })
  it('loads only the signed-in account’s cached plans', () => {
    localStorage.setItem('ariya-cloud-alice', JSON.stringify({ [event.id]: record() }))
    openCloudCache('bob')
    expect(useCloudPlanner.getState().records).toEqual({})
    openCloudCache('alice')
    expect(useCloudPlanner.getState().records[event.id]?.dirty).toBe(true)
    openCloudCache(null)
    expect(useCloudPlanner.getState().records).toEqual({})
  })
})

describe('storage recovery', () => {
  it('keeps unreadable original data from being overwritten', () => {
    localStorage.setItem('ariya-planner', 'not valid json')
    expect(safeStorage.getItem('ariya-planner')).toBeNull()
    safeStorage.setItem('ariya-planner', 'replacement')
    expect(localStorage.getItem('ariya-planner')).toBe('not valid json')
    expect(useStorageStatus.getState().recovery?.raw).toBe('not valid json')
  })
  it('reports write failures and preserves recovery warnings after another key saves', () => {
    preserveUnreadableStorage('ariya-planner')
    safeStorage.setItem('unrelated', '{}')
    expect(useStorageStatus.getState().error).toContain('could not be read')
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('quota')
      },
    })
    safeStorage.setItem('full', '{}')
    expect(useStorageStatus.getState().error).toContain('could not be saved')
  })
})
