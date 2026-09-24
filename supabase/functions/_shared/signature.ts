// Paystack signs every webhook body with HMAC-SHA512 using your secret key and
// sends the hex digest in the `x-paystack-signature` header.
// Plain WebCrypto, so this runs in Deno (Edge Functions) and Node (tests).

const encoder = new TextEncoder()

export async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, [
    'sign',
  ])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time comparison so the signature can't be guessed byte by byte. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPaystackSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header || !secret) return false
  const expected = await hmacSha512Hex(secret, rawBody)
  return timingSafeEqual(expected, header.trim().toLowerCase())
}
