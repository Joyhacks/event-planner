// Queries shared by the marketplace pages.
import { supabase, unwrap } from './supabase'
import type { AsoebiItem, Contest, MarketEvent, TicketType } from './types'

export interface EventBundle {
  event: MarketEvent & { sellers: { display_name: string; slug: string } | null }
  ticketTypes: TicketType[]
  asoebi: AsoebiItem[]
  contests: Contest[]
}

export async function fetchEventBySlug(slug: string): Promise<EventBundle | null> {
  const event = await unwrap(
    await supabase.from('events').select('*, sellers(display_name, slug)').eq('slug', slug).maybeSingle(),
  )
  if (!event) return null
  const [ticketTypes, asoebi, contests] = await Promise.all([
    supabase.from('ticket_types').select('*').eq('event_id', event.id).eq('hidden', false).order('sort').order('price_kobo').then(unwrap),
    supabase.from('asoebi_items').select('*').eq('event_id', event.id).eq('active', true).order('price_kobo').then(unwrap),
    supabase.from('contests').select('*').eq('event_id', event.id).then(unwrap),
  ])
  return {
    event: event as EventBundle['event'],
    ticketTypes: (ticketTypes ?? []) as TicketType[],
    asoebi: (asoebi ?? []) as AsoebiItem[],
    contests: (contests ?? []) as Contest[],
  }
}

export function ticketAvailability(t: TicketType, now = Date.now()) {
  const left = Math.max(0, t.quantity - t.sold)
  if (t.sale_starts_at && now < Date.parse(t.sale_starts_at)) return { state: 'soon' as const, left }
  if (t.sale_ends_at && now > Date.parse(t.sale_ends_at)) return { state: 'ended' as const, left }
  if (left === 0) return { state: 'soldout' as const, left }
  return { state: 'on' as const, left }
}

export const CATEGORY_LABEL: Record<string, string> = {
  party: 'Party',
  owambe: 'Owambe',
  concert: 'Concert',
  wedding: 'Wedding',
  pageant: 'Pageant',
  conference: 'Conference',
  other: 'Other',
}
