import { useEffect } from 'react'
import { useAuth } from '../lib/authContext'
import { runCloudSync } from '../lib/plannerSync'
import { openCloudCache, useCloudPlanner } from '../store/cloudPlanner'
import { useStorageStatus } from '../lib/storageStatus'

export function PlannerSync() {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  useEffect(() => {
    if (loading) return
    openCloudCache(userId)
    if (!userId) return
    return runCloudSync(userId)
  }, [userId, loading])
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (useStorageStatus.getState().error || Object.values(useCloudPlanner.getState().records).some((r) => r.dirty)) {
        event.preventDefault()
        event.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [])
  return null
}
