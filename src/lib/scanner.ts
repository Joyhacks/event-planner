// Pure decision logic for the offline door scanner (unit tested).

export interface ManifestEntry {
  holder_name: string
  ticket_type: string
  status: 'valid' | 'checked_in' | 'void'
}

export type ScanResult = 'admitted' | 'duplicate' | 'void' | 'unknown'

/** Ticket codes are 32 lowercase hex characters; QR readers may add noise. */
export function normaliseCode(raw: string): string | null {
  const m = raw.trim().toLowerCase().match(/[0-9a-f]{32}/)
  return m ? m[0] : null
}

/**
 * Decides an offline scan against the downloaded manifest and marks the
 * ticket used locally, so the same phone never admits a code twice.
 */
export function decideOffline(manifest: Map<string, ManifestEntry>, hash: string): { result: ScanResult; entry?: ManifestEntry } {
  const entry = manifest.get(hash)
  if (!entry) return { result: 'unknown' }
  if (entry.status === 'void') return { result: 'void', entry }
  if (entry.status === 'checked_in') return { result: 'duplicate', entry }
  entry.status = 'checked_in'
  return { result: 'admitted', entry }
}
