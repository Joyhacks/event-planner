import type {
  BudgetCategory,
  Currency,
  EventType,
  GuestGroup,
  Rsvp,
  VendorCategory,
  VendorStatus,
} from './types'

export type Motif = 'oniko' | 'eleko' | 'kente' | 'orbit' | 'checker'

export interface EventTypeMeta {
  label: string
  short: string
  /** Background + foreground for the event cover. */
  bg: string
  fg: string
  accent: string
  motif: Motif
}

export const EVENT_TYPES: Record<EventType, EventTypeMeta> = {
  'trad-wedding': {
    label: 'Traditional wedding',
    short: 'Trad',
    bg: '#ffc700',
    fg: '#0e0e0e',
    accent: '#0e0e0e',
    motif: 'oniko',
  },
  'white-wedding': {
    label: 'White wedding',
    short: 'Wedding',
    bg: '#ffffff',
    fg: '#0e0e0e',
    accent: '#f0287a',
    motif: 'orbit',
  },
  owambe: {
    label: 'Owambe / birthday',
    short: 'Owambe',
    bg: '#f0287a',
    fg: '#0e0e0e',
    accent: '#0e0e0e',
    motif: 'kente',
  },
  naming: {
    label: 'Naming ceremony',
    short: 'Naming',
    bg: '#008751',
    fg: '#ffffff',
    accent: '#ffc700',
    motif: 'eleko',
  },
  remembrance: {
    label: 'Remembrance / burial',
    short: 'Remembrance',
    bg: '#0e0e0e',
    fg: '#ffffff',
    accent: '#ffffff',
    motif: 'eleko',
  },
  corporate: {
    label: 'Launch / corporate',
    short: 'Corporate',
    bg: '#2447d6',
    fg: '#ffffff',
    accent: '#ffc700',
    motif: 'checker',
  },
}

export const CURRENCIES: Record<Currency, { label: string; locale: string }> = {
  NGN: { label: 'Naira (₦)', locale: 'en-NG' },
  GHS: { label: 'Cedi (GH₵)', locale: 'en-GH' },
  KES: { label: 'Shilling (KSh)', locale: 'en-KE' },
  ZAR: { label: 'Rand (R)', locale: 'en-ZA' },
  USD: { label: 'US Dollar ($)', locale: 'en-US' },
}

export const CITIES = [
  'Lagos',
  'Abuja',
  'Port Harcourt',
  'Ibadan',
  'Enugu',
  'Abeokuta',
  'Kano',
  'Benin City',
  'Accra',
  'Kumasi',
  'Nairobi',
  'Johannesburg',
  'Cape Town',
  'London',
  'Houston',
] as const

export const RSVP_LABEL: Record<Rsvp, string> = {
  pending: 'Awaiting',
  yes: 'Coming',
  maybe: 'Maybe',
  no: 'Not coming',
}

export const GROUP_LABEL: Record<GuestGroup, string> = {
  family: 'Family',
  friends: 'Friends',
  colleagues: 'Colleagues',
  faith: 'Church / Mosque',
  vip: 'VIP',
}

export const BUDGET_LABEL: Record<BudgetCategory, string> = {
  venue: 'Venue & hall',
  catering: 'Food & catering',
  drinks: 'Drinks',
  decor: 'Décor & lighting',
  entertainment: 'Music, DJ & MC',
  media: 'Photo & video',
  attire: 'Attire & aso-ebi',
  souvenirs: 'Souvenirs',
  logistics: 'Security & logistics',
  other: 'Other',
}

export const VENDOR_CATEGORY_LABEL: Record<VendorCategory, string> = {
  catering: 'Catering',
  'small-chops': 'Small chops',
  decor: 'Décor',
  venue: 'Venue',
  entertainment: 'Live band & DJ',
  mc: 'MC / Compère',
  media: 'Photo & video',
  attire: 'Fabric & gele',
}

export const VENDOR_STATUS_LABEL: Record<VendorStatus, string> = {
  enquired: 'Enquired',
  booked: 'Booked',
  deposit: 'Deposit paid',
  paid: 'Fully paid',
}

/** Fabric colours offered when setting up aso-ebi. */
export const FABRIC_SWATCHES = [
  { name: 'Adire indigo', hex: '#1f2a5a' },
  { name: 'Camwood', hex: '#b0412a' },
  { name: 'Gold', hex: '#d9a21b' },
  { name: 'Naija green', hex: '#008751' },
  { name: 'Gele pink', hex: '#f0287a' },
  { name: 'Coral bead', hex: '#e0684b' },
  { name: 'Champagne', hex: '#e8d6b3' },
  { name: 'Wine', hex: '#6b1f33' },
  { name: 'Onyx', hex: '#1b1612' },
  { name: 'Lilac', hex: '#9c8ac4' },
  { name: 'Emerald', hex: '#1f7a5c' },
] as const
