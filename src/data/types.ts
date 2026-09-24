export type Currency = 'NGN' | 'GHS' | 'KES' | 'ZAR' | 'USD'

export type EventType =
  | 'trad-wedding'
  | 'white-wedding'
  | 'owambe'
  | 'naming'
  | 'remembrance'
  | 'corporate'

export type Rsvp = 'pending' | 'yes' | 'maybe' | 'no'

export type GuestGroup = 'family' | 'friends' | 'colleagues' | 'faith' | 'vip'

export interface Guest {
  id: string
  name: string
  phone: string
  group: GuestGroup
  rsvp: Rsvp
  plusOnes: number
}

export type BudgetCategory =
  | 'venue'
  | 'catering'
  | 'drinks'
  | 'decor'
  | 'entertainment'
  | 'media'
  | 'attire'
  | 'souvenirs'
  | 'logistics'
  | 'other'

export interface BudgetItem {
  id: string
  category: BudgetCategory
  label: string
  planned: number
  paid: number
}

export type VendorStatus = 'enquired' | 'booked' | 'deposit' | 'paid'

export interface BookedVendor {
  vendorId: string
  status: VendorStatus
}

export interface ScheduleItem {
  id: string
  time: string
  title: string
  owner: string
}

export interface AsoebiBuyer {
  id: string
  name: string
  sets: number
  paid: boolean
  collected: boolean
}

export interface Asoebi {
  fabric: string
  pricePerSet: number
  colors: string[]
  payTo: string
  buyers: AsoebiBuyer[]
}

export interface PlannerEvent {
  id: string
  title: string
  type: EventType
  /** Local calendar date, YYYY-MM-DD. Never parse with `new Date(str)`. */
  date: string
  /** 24h local time, HH:mm */
  startTime: string
  venue: string
  city: string
  currency: Currency
  budget: number
  guestTarget: number
  hosts: string
  createdAt: string
  isSample?: boolean
  guests: Guest[]
  budgetItems: BudgetItem[]
  vendors: BookedVendor[]
  schedule: ScheduleItem[]
  asoebi: Asoebi | null
}

export type VendorCategory =
  | 'catering'
  | 'decor'
  | 'venue'
  | 'entertainment'
  | 'media'
  | 'attire'
  | 'small-chops'
  | 'mc'

export interface Vendor {
  id: string
  name: string
  category: VendorCategory
  city: string
  currency: Currency
  priceFrom: number
  rating: number
  blurb: string
  tags: string[]
}
