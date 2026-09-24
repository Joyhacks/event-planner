import { toDateInput } from '../lib/dates'
import { uid } from '../lib/id'
import type { Guest, PlannerEvent } from './types'

function guest(name: string, group: Guest['group'], rsvp: Guest['rsvp'], plusOnes = 0, phone = ''): Guest {
  return { id: uid(), name, group, rsvp, plusOnes, phone }
}

/** A realistic demo event so a first-time visitor sees the product working. */
export function createSampleEvent(now = new Date()): PlannerEvent {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 45)
  return {
    id: uid(),
    title: 'Adaeze & Tobi',
    type: 'trad-wedding',
    date: toDateInput(date),
    startTime: '12:00',
    venue: 'Harbour Hall, Victoria Island',
    city: 'Lagos',
    currency: 'NGN',
    budget: 18_500_000,
    guestTarget: 450,
    hosts: 'The Okafor & Adeyemi families',
    createdAt: now.toISOString(),
    isSample: true,
    guests: [
      guest('Chief & Mrs Okafor', 'family', 'yes', 1, '0803 000 1122'),
      guest('Mummy Bisi Adeyemi', 'family', 'yes', 0),
      guest('Uncle Emeka', 'family', 'maybe', 2),
      guest('Pastor & Mrs Ojo', 'faith', 'yes', 1),
      guest('Alhaji Musa Bello', 'vip', 'pending', 1),
      guest('Kemi from Access', 'colleagues', 'pending', 0),
      guest('The Nwosu twins', 'friends', 'yes', 0),
      guest('Aunty Funke', 'family', 'no', 0),
      guest('Dr Ifeoma Eze', 'vip', 'yes', 1),
      guest('Tunde Bakare', 'friends', 'pending', 1),
      guest('Mrs Ngozi Obi', 'family', 'yes', 3),
      guest('Segun & Amaka', 'friends', 'maybe', 0),
    ],
    budgetItems: [
      { id: uid(), category: 'venue', label: 'Harbour Hall, full day', planned: 4_000_000, paid: 2_000_000 },
      { id: uid(), category: 'catering', label: 'Jollof, ofada, asun, 450 plates', planned: 4_200_000, paid: 1_500_000 },
      { id: uid(), category: 'drinks', label: 'Palm wine, Zobo, soft drinks', planned: 1_100_000, paid: 0 },
      { id: uid(), category: 'decor', label: 'Stage and draping', planned: 2_800_000, paid: 1_400_000 },
      { id: uid(), category: 'entertainment', label: 'Live band + MC', planned: 1_800_000, paid: 600_000 },
      { id: uid(), category: 'media', label: 'Photo, video, drone', planned: 1_200_000, paid: 600_000 },
      { id: uid(), category: 'attire', label: 'Couple outfits + gele', planned: 1_500_000, paid: 1_500_000 },
      { id: uid(), category: 'souvenirs', label: 'Branded hand fans', planned: 450_000, paid: 0 },
      { id: uid(), category: 'logistics', label: 'Security, ushers, parking', planned: 650_000, paid: 0 },
    ],
    vendors: [
      { vendorId: 'v-harbour', status: 'deposit' },
      { vendorId: 'v-mama-tee', status: 'deposit' },
      { vendorId: 'v-ewa', status: 'booked' },
      { vendorId: 'v-gbedu', status: 'enquired' },
    ],
    schedule: [
      { id: uid(), time: '11:30', title: 'Guests arrive, small chops and palm wine', owner: 'Ushers' },
      { id: uid(), time: '12:30', title: "Groom's family is introduced", owner: 'MC' },
      { id: uid(), time: '13:15', title: 'Bride dances in with her friends', owner: 'Live band' },
      { id: uid(), time: '14:00', title: 'Bride price and blessings', owner: 'Elders' },
      { id: uid(), time: '15:00', title: 'Lunch is served', owner: "Mama Tee's Pot" },
      { id: uid(), time: '16:30', title: 'Dance floor opens, spraying', owner: 'DJ' },
    ],
    asoebi: {
      fabric: 'Aso-oke, indigo & gold',
      pricePerSet: 85_000,
      colors: ['#1f2a5a', '#d99a2b'],
      payTo: 'GTBank 0123456789, Adaeze Okafor',
      buyers: [
        { id: uid(), name: 'Mummy Bisi', sets: 2, paid: true, collected: true },
        { id: uid(), name: 'Uncle Emeka', sets: 3, paid: true, collected: false },
        { id: uid(), name: 'Mrs Ngozi Obi', sets: 4, paid: false, collected: false },
        { id: uid(), name: 'The Nwosu twins', sets: 2, paid: true, collected: true },
        { id: uid(), name: 'Tunde Bakare', sets: 1, paid: false, collected: false },
      ],
    },
  }
}
