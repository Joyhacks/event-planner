import { CalendarHeart, Plus, Store } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Signboard } from '../components/Signboard'
import { usePlanner } from '../store/planner'

const NAV = [
  { to: '/app', label: 'My events', icon: CalendarHeart, end: true },
  { to: '/app/events/new', label: 'New event', icon: Plus, end: true },
  { to: '/app/vendors', label: 'Vendors', icon: Store, end: false },
]

export function AppLayout() {
  const seedIfFirstVisit = usePlanner((s) => s.seedIfFirstVisit)
  useEffect(() => seedIfFirstVisit(), [seedIfFirstVisit])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-danfo">
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink text-white lg:flex">
        <div className="px-6 pt-7 pb-10">
          <Logo to="/app" />
        </div>
        <nav aria-label="Planner" className="flex flex-col gap-1.5 px-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3.5 text-[0.95rem] font-semibold transition-colors ${
                  isActive ? 'bg-danfo text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-4 pb-5">
          <Signboard className="-rotate-2">
            <p className="font-sign text-[1.05rem] leading-[1.1]">Party no dey sweet if planning no set</p>
          </Signboard>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b-2 border-ink bg-danfo px-5 lg:hidden">
        <Logo to="/app" inverted />
      </header>

      <main id="main" className="min-w-0 pb-28 lg:pb-16">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Planner"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t-2 border-ink bg-ink pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-bold ${isActive ? 'text-danfo' : 'text-white/60'}`
            }
          >
            <Icon size={20} strokeWidth={2.25} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
    </div>
  )
}
