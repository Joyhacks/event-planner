import type { PlannerEvent } from '../data/types'
import { formatDate } from './dates'
import { formatMoney } from './money'

/** Plain-text message the host can paste into the family WhatsApp group. */
export function asoebiMessage(event: PlannerEvent): string {
  if (!event.asoebi) return ''
  const a = event.asoebi
  return [
    `*Aso-ebi for ${event.title}*`,
    `${formatDate(event.date)} · ${event.city}`,
    '',
    `Fabric: ${a.fabric}`,
    `Price: ${formatMoney(a.pricePerSet, event.currency)} per set`,
    a.payTo ? `Pay to: ${a.payTo}` : '',
    '',
    'Reply with your name and how many sets you want. Thank you!',
  ]
    .filter((line, i, all) => line !== '' || all[i - 1] !== '')
    .join('\n')
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
