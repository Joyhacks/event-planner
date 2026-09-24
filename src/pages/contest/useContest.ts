import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase, unwrap } from '../../lib/supabase'
import type { Contest, Contestant, VotePackage } from '../../lib/types'

export interface ContestBundle {
  contest: Contest & { events: { title: string; slug: string; status: string } | null }
  contestants: Contestant[]
  packages: VotePackage[]
}

/** Contest data plus a realtime subscription that keeps vote counts live. */
export function useContest(contestId: string) {
  const qc = useQueryClient()
  const key = ['contest', contestId]
  const query = useQuery({
    queryKey: key,
    queryFn: async (): Promise<ContestBundle | null> => {
      const contest = await unwrap(await supabase.from('contests').select('*, events(title, slug, status)').eq('id', contestId).maybeSingle())
      if (!contest) return null
      const [contestants, packages] = await Promise.all([
        supabase.from('contestants').select('*').eq('contest_id', contestId).eq('status', 'active').order('votes_count', { ascending: false }).then(unwrap),
        supabase.from('vote_packages').select('*').eq('contest_id', contestId).eq('active', true).order('price_kobo').then(unwrap),
      ])
      return { contest: contest as ContestBundle['contest'], contestants: (contestants ?? []) as Contestant[], packages: (packages ?? []) as VotePackage[] }
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel(`contest-${contestId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants', filter: `contest_id=eq.${contestId}` }, (payload) => {
        qc.setQueryData<ContestBundle | null>(['contest', contestId], (old) => {
          if (!old) return old
          const row = payload.new as Contestant
          if (!row?.id) return old
          const exists = old.contestants.some((c) => c.id === row.id)
          const list = exists ? old.contestants.map((c) => (c.id === row.id ? { ...c, ...row } : c)) : [...old.contestants, row]
          return { ...old, contestants: list.filter((c) => c.status === 'active') }
        })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [contestId, qc])

  return query
}
