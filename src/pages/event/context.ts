import { useOutletContext } from 'react-router-dom'
import type { PlannerEvent } from '../../data/types'

export function useEventContext() {
  return useOutletContext<{ event: PlannerEvent }>()
}
