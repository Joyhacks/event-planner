import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { buttonClass } from '../components/styles'
import { useAuth } from '../lib/authContext'
import { backendReady } from '../lib/supabase'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `shrink-0 rounded-full px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-colors ${
    isActive ? 'bg-ink text-danfo' : 'hover:bg-ink/10'
  }`

export function SiteLayout() {
  const { user, profile, signOut } = useAuth()
  const isSeller = profile?.role === 'seller' || profile?.role === 'super_admin'

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-danfo">
        Skip to content
      </a>
      <header className="grain relative z-20 border-b-2 border-ink bg-danfo">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 pt-4 pb-3 sm:px-8 md:py-4">
          <Logo inverted />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <NavItems isSeller={isSeller} isAdmin={profile?.role === 'super_admin'} />
          </nav>
          <div className="flex items-center gap-2">
            {backendReady && user ? (
              <>
                <Link to="/account/tickets" className={buttonClass('ink', 'sm')}>
                  My tickets
                </Link>
                <button type="button" onClick={() => void signOut()} className="hidden text-sm font-bold hover:underline sm:inline">
                  Sign out
                </button>
              </>
            ) : backendReady ? (
              <Link to="/signin" className={buttonClass('ink', 'sm')}>
                Sign in
              </Link>
            ) : (
              <Link to="/app" className={buttonClass('ink', 'sm')}>
                Open planner
              </Link>
            )}
          </div>
        </div>
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] md:hidden">
          <NavItems isSeller={isSeller} isAdmin={profile?.role === 'super_admin'} />
        </nav>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="bg-ink text-white">
        <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-white/70">Loud celebrations, calm planning. Made in Lagos, for everywhere we gather.</p>
          </div>
          <div className="flex flex-col gap-4 sm:items-end">
            <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-white/80">
              <Link to="/legal/terms" className="hover:text-danfo">Terms</Link>
              <Link to="/legal/refunds" className="hover:text-danfo">Refund policy</Link>
              <Link to="/legal/privacy" className="hover:text-danfo">Privacy</Link>
              <Link to="/sell" className="hover:text-danfo">Sell tickets</Link>
            </nav>
            <p className="tabular text-sm text-white/60">© {new Date().getFullYear()} Ariya · Ẹ ṣé o, thank you for celebrating with us.</p>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}

function NavItems({ isSeller, isAdmin }: { isSeller: boolean; isAdmin: boolean }) {
  return (
    <>
      <NavLink to="/events" className={linkClass}>
        Events
      </NavLink>
      <NavLink to="/app" className={linkClass}>
        Planner
      </NavLink>
      <NavLink to={isSeller ? '/seller' : '/sell'} className={linkClass}>
        {isSeller ? 'My events' : 'Sell tickets'}
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={linkClass}>
          Admin
        </NavLink>
      )}
    </>
  )
}
