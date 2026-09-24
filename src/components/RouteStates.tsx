import { useEffect } from 'react'
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { reportError } from '../lib/monitoring'
import { buttonClass } from './styles'

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <svg viewBox="0 0 40 40" className="h-10 w-10 animate-spin text-ink [animation-duration:1.6s]" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 5" />
        <circle cx="20" cy="20" r="7" fill="#ffc700" stroke="currentColor" strokeWidth="3" />
      </svg>
    </div>
  )
}

export function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  useEffect(() => {
    if (import.meta.env.DEV) console.error(error)
    if (!notFound) reportError(error)
  }, [error, notFound])

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-20">
      <p className="font-sign text-6xl text-pink">Ehn ehn.</p>
      <h1 className="font-display mt-4 text-2xl">
        {notFound ? 'We could not find that page.' : 'Something broke on our side.'}
      </h1>
      <p className="mt-2 text-ink-soft">
        {notFound
          ? 'The link may be old, or the event was deleted.'
          : 'Your events are saved on this device. Reload the page and carry on; if it keeps happening, tell us what you clicked.'}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/app" className={buttonClass('ink')}>
          Back to my events
        </Link>
        <button type="button" onClick={() => window.location.reload()} className={buttonClass('outline')}>
          Reload
        </button>
      </div>
    </main>
  )
}
