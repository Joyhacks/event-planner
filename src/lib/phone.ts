/** "0803 123 4567" → "2348031234567" (E.164 without +). */
export function toE164Nigeria(input: string): string | null {
  const digits = input.replace(/\D/g, '')
  if (/^0[789][01]\d{8}$/.test(digits)) return '234' + digits.slice(1)
  if (/^234[789][01]\d{8}$/.test(digits)) return digits
  if (/^\d{10,15}$/.test(digits) && input.trim().startsWith('+')) return digits
  return null
}
