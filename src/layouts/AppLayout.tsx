import { CalendarHeart, Plus, Store } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Motif } from '../components/Motif'
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
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-paper lg:flex">
        <div className="px-6 pt-7 pb-10">
          <Logo to="/app" />
        </div>
        <nav aria-label="Planner" className="flex flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-full px-4 text-[0.95rem] transition-colors ${
                  isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-paper-2 hover:text-ink'
                }`
              }
            >
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="relative mx-3 mt-auto mb-4 overflow-hidden rounded-sm bg-indigo p-5 text-paper">
          <Motif kind="eleko" color="#d99a2b" opacity={0.35} />
          <p className="relative font-serif text-xl leading-snug italic">“Party no dey sweet if planning no set.”</p>
          <p className="relative mt-2 text-xs text-paper/70">Every Lagos aunty, ever</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center border-b border-line bg-paper/90 px-5 backdrop-blur lg:hidden">
        <Logo to="/app" />
      </header>

      <main id="main" className="min-w-0 pb-28 lg:pb-16">
        <Outlet />
      </main>

      {/* Mobile tab bar */}
      <nav
        aria-label="Planner"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-16 flex-col items-center justify-center gap-1 text-[0.72rem] font-medium ${
                isActive ? 'text-clay' : 'text-ink-soft'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
    </div>
  )
}
