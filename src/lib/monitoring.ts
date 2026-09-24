// Error monitoring. Off unless VITE_SENTRY_DSN is set; the SDK loads after
// the page is interactive so it never slows the first view.

type Sentry = typeof import('@sentry/react')

const dsn = import.meta.env.VITE_SENTRY_DSN
let sentry: Sentry | null = null

/** Drops query strings, which can hold magic-link codes and order references. */
export function scrubUrl(url: string | undefined): string | undefined {
  if (!url) return url
  const q = url.indexOf('?')
  return q === -1 ? url : url.slice(0, q)
}

export function initMonitoring() {
  if (!dsn) return
  const start = () =>
    void import('@sentry/react').then((s) => {
      s.init({
        dsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0,
        beforeSend(event) {
          if (event.request) {
            event.request.url = scrubUrl(event.request.url)
            delete event.request.query_string
            delete event.request.cookies
          }
          return event
        },
        beforeBreadcrumb(crumb) {
          if (crumb.data?.url) crumb.data.url = scrubUrl(String(crumb.data.url))
          if (crumb.data?.to) crumb.data.to = scrubUrl(String(crumb.data.to))
          if (crumb.data?.from) crumb.data.from = scrubUrl(String(crumb.data.from))
          return crumb
        },
      })
      sentry = s
    })
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 4000 })
  else setTimeout(start, 2000)
}

export function reportError(error: unknown) {
  if (sentry) sentry.captureException(error)
}
