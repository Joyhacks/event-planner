import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createSampleEvent } from '../data/sample'
import type { Asoebi, AsoebiBuyer, BudgetItem, Guest, PlannerEvent, ScheduleItem, VendorStatus } from '../data/types'
import { uid } from '../lib/id'
import { safeStorage, useStorageStatus, preserveUnreadableStorage } from '../lib/storageStatus'
import { changeCloudEvent, useCloudPlanner } from './cloudPlanner'
import { useMemo } from 'react'
import { parsePlannerEvent, restoredCopy } from '../lib/plannerBackup'

export type NewEventInput = Omit<
  PlannerEvent,
  'id' | 'createdAt' | 'guests' | 'budgetItems' | 'vendors' | 'schedule' | 'asoebi' | 'isSample'
>

interface PlannerState {
  events: PlannerEvent[]
  seeded: boolean
  seedIfFirstVisit: () => void
  loadSample: () => string
  createEvent: (input: NewEventInput) => string
  updateEvent: (id: string, patch: Partial<NewEventInput>) => void
  deleteEvent: (id: string) => void
  restoreEvents: (events: PlannerEvent[]) => void
  importGuests: (eventId: string, guests: Omit<Guest, 'id'>[]) => void
  setCustomVendor: (eventId: string, vendor: import('../data/types').BookedVendor) => void
  updateScheduleItem: (eventId: string, itemId: string, item: Omit<ScheduleItem, 'id'>) => void

  addGuest: (eventId: string, guest: Omit<Guest, 'id'>) => void
  updateGuest: (eventId: string, guestId: string, patch: Partial<Guest>) => void
  removeGuest: (eventId: string, guestId: string) => void

  addBudgetItem: (eventId: string, item: Omit<BudgetItem, 'id'>) => void
  updateBudgetItem: (eventId: string, itemId: string, patch: Partial<BudgetItem>) => void
  removeBudgetItem: (eventId: string, itemId: string) => void

  setVendorStatus: (eventId: string, vendorId: string, status: VendorStatus) => void
  removeVendor: (eventId: string, vendorId: string) => void

  addScheduleItem: (eventId: string, item: Omit<ScheduleItem, 'id'>) => void
  removeScheduleItem: (eventId: string, itemId: string) => void

  setAsoebi: (eventId: string, asoebi: Omit<Asoebi, 'buyers'>) => void
  clearAsoebi: (eventId: string) => void
  addBuyer: (eventId: string, buyer: Omit<AsoebiBuyer, 'id'>) => void
  updateBuyer: (eventId: string, buyerId: string, patch: Partial<AsoebiBuyer>) => void
  removeBuyer: (eventId: string, buyerId: string) => void
}

type Patch = (event: PlannerEvent) => PlannerEvent

export const usePlanner = create<PlannerState>()(
  persist(
    (set, get) => {
      const patchEvent = (id: string, fn: Patch) => {
        if (changeCloudEvent(id, fn)) return
        set((s) => ({ events: s.events.map((e) => (e.id === id ? fn(e) : e)) }))
      }

      return {
        events: [],
        seeded: false,

        seedIfFirstVisit: () => {
          if (get().seeded || useStorageStatus.getState().recovery) return
          set((s) => ({ seeded: true, events: s.events.length ? s.events : [createSampleEvent()] }))
        },

        loadSample: () => {
          const sample = createSampleEvent()
          set((s) => ({ events: [...s.events, sample] }))
          return sample.id
        },

        createEvent: (input) => {
          const event: PlannerEvent = {
            ...input,
            id: uid(),
            createdAt: new Date().toISOString(),
            guests: [],
            budgetItems: [],
            vendors: [],
            schedule: [],
            asoebi: null,
          }
          set((s) => ({ events: [...s.events, event] }))
          return event.id
        },

        updateEvent: (id, patch) => patchEvent(id, (e) => ({ ...e, ...patch })),
        deleteEvent: (id) => set((s) => ({ events: s.events.filter((e) => e.id !== id) })),
        restoreEvents: (events) => set((s) => ({ seeded: true, events: [...s.events, ...events.map(restoredCopy)] })),
        importGuests: (eventId, guests) =>
          patchEvent(eventId, (e) => ({ ...e, guests: [...e.guests, ...guests.map((g) => ({ ...g, id: uid() }))] })),
        setCustomVendor: (eventId, vendor) =>
          patchEvent(eventId, (e) => ({
            ...e,
            vendors: e.vendors.some((v) => v.vendorId === vendor.vendorId)
              ? e.vendors.map((v) => (v.vendorId === vendor.vendorId ? vendor : v))
              : [...e.vendors, vendor],
          })),
        updateScheduleItem: (eventId, itemId, item) =>
          patchEvent(eventId, (e) => ({
            ...e,
            schedule: e.schedule
              .map((s) => (s.id === itemId ? { ...item, id: itemId } : s))
              .sort((a, b) => a.time.localeCompare(b.time)),
          })),

        addGuest: (eventId, guest) =>
          patchEvent(eventId, (e) => ({ ...e, guests: [{ ...guest, id: uid() }, ...e.guests] })),
        updateGuest: (eventId, guestId, patch) =>
          patchEvent(eventId, (e) => ({
            ...e,
            guests: e.guests.map((g) => (g.id === guestId ? { ...g, ...patch } : g)),
          })),
        removeGuest: (eventId, guestId) =>
          patchEvent(eventId, (e) => ({ ...e, guests: e.guests.filter((g) => g.id !== guestId) })),

        addBudgetItem: (eventId, item) =>
          patchEvent(eventId, (e) => ({ ...e, budgetItems: [...e.budgetItems, { ...item, id: uid() }] })),
        updateBudgetItem: (eventId, itemId, patch) =>
          patchEvent(eventId, (e) => ({
            ...e,
            budgetItems: e.budgetItems.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
          })),
        removeBudgetItem: (eventId, itemId) =>
          patchEvent(eventId, (e) => ({ ...e, budgetItems: e.budgetItems.filter((i) => i.id !== itemId) })),

        setVendorStatus: (eventId, vendorId, status) =>
          patchEvent(eventId, (e) => {
            const exists = e.vendors.some((v) => v.vendorId === vendorId)
            return {
              ...e,
              vendors: exists
                ? e.vendors.map((v) => (v.vendorId === vendorId ? { ...v, status } : v))
                : [...e.vendors, { vendorId, status }],
            }
          }),
        removeVendor: (eventId, vendorId) =>
          patchEvent(eventId, (e) => ({ ...e, vendors: e.vendors.filter((v) => v.vendorId !== vendorId) })),

        addScheduleItem: (eventId, item) =>
          patchEvent(eventId, (e) => ({
            ...e,
            schedule: [...e.schedule, { ...item, id: uid() }].sort((a, b) => a.time.localeCompare(b.time)),
          })),
        removeScheduleItem: (eventId, itemId) =>
          patchEvent(eventId, (e) => ({ ...e, schedule: e.schedule.filter((i) => i.id !== itemId) })),

        setAsoebi: (eventId, asoebi) =>
          patchEvent(eventId, (e) => ({
            ...e,
            asoebi: {
              ...asoebi,
              buyers: (e.asoebi?.buyers ?? []).map((b) => ({
                ...b,
                amountPaid: b.amountPaid ?? (b.paid ? b.sets * e.asoebi!.pricePerSet : 0),
              })),
            },
          })),
        clearAsoebi: (eventId) => patchEvent(eventId, (e) => ({ ...e, asoebi: null })),
        addBuyer: (eventId, buyer) =>
          patchEvent(eventId, (e) =>
            e.asoebi ? { ...e, asoebi: { ...e.asoebi, buyers: [...e.asoebi.buyers, { ...buyer, id: uid() }] } } : e,
          ),
        updateBuyer: (eventId, buyerId, patch) =>
          patchEvent(eventId, (e) =>
            e.asoebi
              ? {
                  ...e,
                  asoebi: {
                    ...e.asoebi,
                    buyers: e.asoebi.buyers.map((b) => (b.id === buyerId ? { ...b, ...patch } : b)),
                  },
                }
              : e,
          ),
        removeBuyer: (eventId, buyerId) =>
          patchEvent(eventId, (e) =>
            e.asoebi ? { ...e, asoebi: { ...e.asoebi, buyers: e.asoebi.buyers.filter((b) => b.id !== buyerId) } } : e,
          ),
      }
    },
    {
      name: 'ariya-planner',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ events: s.events, seeded: s.seeded }),
      merge: (persisted, current) => {
        try {
          const saved = persisted as { events?: unknown[]; seeded?: boolean } | undefined
          return { ...current, events: (saved?.events ?? []).map(parsePlannerEvent), seeded: Boolean(saved?.seeded) }
        } catch {
          preserveUnreadableStorage('ariya-planner')
          // Do not seed over unreadable data.
          return { ...current, seeded: true }
        }
      },
    },
  ),
)

export function useEvent(id: string | undefined): PlannerEvent | undefined {
  const local = usePlanner((s) => s.events.find((e) => e.id === id))
  const remote = useCloudPlanner((s) => (id ? s.records[id]?.event : undefined))
  return remote ?? local
}

export function useAllEvents() {
  const local = usePlanner((s) => s.events)
  const records = useCloudPlanner((s) => s.records)
  return useMemo(
    () => [...local.filter((e) => !records[e.id]), ...Object.values(records).map((r) => r.event)],
    [local, records],
  )
}
