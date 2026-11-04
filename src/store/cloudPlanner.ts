import { create } from 'zustand'
import type { PlannerEvent } from '../data/types'
import { parsePlannerEvent } from '../lib/plannerBackup'
import { safeStorage, preserveUnreadableStorage } from '../lib/storageStatus'

export type MemberRole = 'owner' | 'editor' | 'viewer'
export interface CloudRecord {
  event: PlannerEvent
  revision: number
  role: MemberRole
  dirty: boolean
  error?: string
  conflict?: boolean
}
interface CloudState {
  userId: string | null
  records: Record<string, CloudRecord>
  loading: boolean
  error: string
}
export const useCloudPlanner = create<CloudState>()(() => ({ userId: null, records: {}, loading: false, error: '' }))
const cacheKey = (id: string) => `ariya-cloud-${id}`

export function openCloudCache(userId: string | null) {
  const records: Record<string, CloudRecord> = {}
  if (userId) {
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey(userId)) || '{}') as Record<string, CloudRecord>
      for (const [key, value] of Object.entries(cached)) {
        const event = parsePlannerEvent(value.event)
        if (
          event.id === key &&
          ['owner', 'editor', 'viewer'].includes(value.role) &&
          Number.isSafeInteger(value.revision) &&
          value.revision > 0
        )
          records[key] = { ...value, event, dirty: Boolean(value.dirty) }
      }
    } catch {
      preserveUnreadableStorage(cacheKey(userId))
    }
  }
  useCloudPlanner.setState({ userId, records, loading: Boolean(userId), error: '' })
}
useCloudPlanner.subscribe((s, previous) => {
  if (s.userId && s.userId === previous.userId && s.records !== previous.records)
    safeStorage.setItem(cacheKey(s.userId), JSON.stringify(s.records))
})

export function changeCloudEvent(id: string, patch: (event: PlannerEvent) => PlannerEvent): boolean {
  const current = useCloudPlanner.getState().records[id]
  if (!current) return false
  if (current.role === 'viewer' || current.conflict) return true
  useCloudPlanner.setState((s) => ({
    records: { ...s.records, [id]: { ...current, event: patch(current.event), dirty: true, error: undefined } },
  }))
  return true
}
