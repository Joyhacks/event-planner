import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth, type Role } from '../lib/authContext'
import { backendReady } from '../lib/supabase'
import { PageLoader } from './RouteStates'
import { buttonClass } from './styles'

export function BackendMissing() {
  return (
    <div className="mx-auto max-w-xl px-5 py-20 text-center">
      <p className="font-sign text-4xl text-pink">Almost ready</p>
      <h1 className="font-display mt-4 text-2xl">Ticketing is being connected.</h1>
      <p className="mt-2 font-medium text-ink-soft">
        This part of Ariya needs the Supabase backend. Until it is connected you can still use the free planner.
      </p>
      <Link to="/app" className={buttonClass('ink', 'md', 'mt-8')}>
        Open the planner
      </Link>
    </div>
  )
}

/** Shows children only to signed-in users (optionally with a role). */
export function RequireAuth({ children, role }: { children: ReactNode; role?: Role | Role[] }) {
  const { loading, user, profile } = useAuth()
  const location = useLocation()
  if (!backendReady) return <BackendMissing />
  if (loading || (user && !profile)) return <PageLoader />
  if (!user) return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  const roles = role ? (Array.isArray(role) ? role : [role]) : null
  if (roles && profile && !roles.includes(profile.role) && profile.role !== 'super_admin') {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center">
        <h1 className="font-display text-2xl">This page is for {roles.join(' / ').replace('_', ' ')}s.</h1>
        <Link to="/" className={buttonClass('ink', 'md', 'mt-6')}>
          Go home
        </Link>
      </div>
    )
  }
  return <>{children}</>
}
