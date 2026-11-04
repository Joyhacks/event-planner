import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

/**
 * Contest pages work at /c/:contestId and at the shareable
 * /e/:slug/vote (the event's first contest).
 */
export function useContestId(): { id: string | null; loading: boolean; slug: string | null } {
  const { contestId, slug } = useParams()
  const q = useQuery({
    queryKey: ['contest-by-slug', slug],
    enabled: !contestId && Boolean(slug),
    queryFn: async () => {
      const { data: ev } = await supabase.from('events').select('id').eq('slug', slug!).maybeSingle()
      if (!ev) return null
      const { data } = await supabase.from('contests').select('id').eq('event_id', ev.id).order('created_at').limit(1).maybeSingle()
      return data?.id ?? null
    },
  })
  if (contestId) return { id: contestId, loading: false, slug: null }
  return { id: q.data ?? null, loading: q.isLoading, slug: slug ?? null }
}

export function voteUrl(eventSlug: string | undefined, contestId: string, number?: number): string {
  const base = eventSlug ? `/e/${eventSlug}/vote` : `/c/${contestId}`
  return `${window.location.origin}${base}${number ? `/${number}` : ''}`
}
