/** Accept only an unambiguous path on this origin after a magic-link login. */
export function safeNext(next: string | null): string {
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    [...next].some((c) => c.charCodeAt(0) < 32)
  )
    return '/app'
  const url = new URL(next, 'https://ariya.invalid')
  return url.origin === 'https://ariya.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/app'
}
