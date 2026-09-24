import { describe, expect, it } from 'vitest'
import { decideOffline, normaliseCode, type ManifestEntry } from './scanner'

describe('offline scanner', () => {
  it('extracts a 32-char code from noisy QR text', () => {
    expect(normaliseCode('  ABCDEF0123456789ABCDEF0123456789\n')).toBe('abcdef0123456789abcdef0123456789')
    expect(normaliseCode('https://x.test/t/abcdef0123456789abcdef0123456789')).toBe('abcdef0123456789abcdef0123456789')
    expect(normaliseCode('not a ticket')).toBeNull()
  })

  it('admits once, then reports duplicates, voids and unknowns', () => {
    const m = new Map<string, ManifestEntry>([
      ['h1', { holder_name: 'Bisi', ticket_type: 'Regular', status: 'valid' }],
      ['h2', { holder_name: 'Tunde', ticket_type: 'VIP', status: 'void' }],
    ])
    expect(decideOffline(m, 'h1').result).toBe('admitted')
    expect(decideOffline(m, 'h1').result).toBe('duplicate')
    expect(decideOffline(m, 'h2').result).toBe('void')
    expect(decideOffline(m, 'nope').result).toBe('unknown')
  })
})
