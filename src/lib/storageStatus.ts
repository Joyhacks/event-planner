import { create } from 'zustand'
import type { StateStorage } from 'zustand/middleware'

export const useStorageStatus = create<{ error: string; recovery: { key: string; raw: string } | null }>()(() => ({
  error: '',
  recovery: null,
}))
const failures = new Set<string>()
export function preserveUnreadableStorage(key: string) {
  let raw = ''
  try {
    raw = localStorage.getItem(key) ?? ''
  } catch {
    /* Original remains untouched. */
  }
  useStorageStatus.setState({
    recovery: { key, raw },
    error: 'Saved data could not be read. Open Backup & account to download the original data and recover safely.',
  })
}
export function clearUnreadableStorage() {
  const recovery = useStorageStatus.getState().recovery
  if (!recovery) return
  localStorage.removeItem(recovery.key)
  useStorageStatus.setState({ recovery: null, error: '' })
}
export const safeStorage: StateStorage = {
  getItem(name) {
    try {
      const raw = localStorage.getItem(name)
      if (raw) {
        try {
          JSON.parse(raw)
        } catch {
          preserveUnreadableStorage(name)
          return null
        }
      }
      return raw
    } catch {
      failures.add(name)
      useStorageStatus.setState({
        error: 'Browser storage is unavailable. Download a backup before closing this page.',
      })
      return null
    }
  },
  setItem(name, value) {
    if (useStorageStatus.getState().recovery?.key === name) return
    try {
      localStorage.setItem(name, value)
      failures.delete(name)
      if (!failures.size && !useStorageStatus.getState().recovery) useStorageStatus.setState({ error: '' })
    } catch {
      failures.add(name)
      useStorageStatus.setState({
        error: 'Changes could not be saved on this device. Download a backup before closing this page.',
      })
    }
  },
  removeItem(name) {
    try {
      localStorage.removeItem(name)
    } catch {
      useStorageStatus.setState({ error: 'This browser could not remove saved data.' })
    }
  },
}
