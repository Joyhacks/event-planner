// Row shapes for the marketplace tables (subset of columns the UI uses).

export type EventStatus = 'draft' | 'published' | 'postponed' | 'cancelled' | 'ended'

export interface FormField {
  id: string
  label: string
  type: 'text' | 'select'
  required: boolean
  options?: string[]
}

export interface MarketEvent {
  id: string
  seller_id: string
  slug: string
  title: string
  description: string
  category: string
  venue: string
  address: string
  city: string
  starts_at: string
  ends_at: string | null
  cover_url: string | null
  status: EventStatus
  status_note: string
  fee_bearer: 'buyer' | 'seller'
  form_fields: FormField[]
}

export interface TicketType {
  id: string
  event_id: string
  name: string
  description: string
  kind: 'single' | 'table' | 'entry'
  seats: number
  price_kobo: number
  quantity: number
  sold: number
  sale_starts_at: string | null
  sale_ends_at: string | null
  max_per_order: number
  hidden: boolean
  contest_id: string | null
  sort: number
}

export interface AsoebiItem {
  id: string
  event_id: string
  name: string
  description: string
  colors: string[]
  price_kobo: number
  stock: number
  sold: number
  active: boolean
}

export interface Contest {
  id: string
  event_id: string
  title: string
  description: string
  voting_starts_at: string
  voting_ends_at: string
  free_votes_enabled: boolean
  show_counts: boolean
  permit_confirmed: boolean
}

export interface Contestant {
  id: string
  contest_id: string
  user_id: string | null
  number: number
  display_name: string
  bio: string
  photo_url: string | null
  status: 'active' | 'withdrawn'
  votes_count: number
}

export interface VotePackage {
  id: string
  contest_id: string
  votes: number
  price_kobo: number
  active: boolean
}

export interface Order {
  id: string
  reference: string
  buyer_id: string
  event_id: string
  kind: 'purchase' | 'votes' | 'comp'
  status: 'pending' | 'paid' | 'expired' | 'refund_pending' | 'refunded' | 'flagged'
  subtotal_kobo: number
  discount_kobo: number
  buyer_fee_kobo: number
  total_kobo: number
  commission_kobo: number
  buyer_name: string
  buyer_email: string
  buyer_phone: string
  answers: Record<string, string>
  paid_at: string | null
  expires_at: string
  created_at: string
}

export interface Ticket {
  id: string
  order_id: string
  event_id: string
  ticket_type_id: string
  code: string
  holder_name: string
  status: 'valid' | 'checked_in' | 'void'
  checked_in_at: string | null
}

export interface OrderQuote {
  order_id: string
  reference: string
  subtotal_kobo: number
  discount_kobo: number
  buyer_fee_kobo: number
  total_kobo: number
  free: boolean
  expires_at: string
}
