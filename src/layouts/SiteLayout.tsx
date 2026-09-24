import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { buttonClass } from '../components/styles'

export function SiteLayout() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-danfo">
        Skip to content
      </a>
      <header className="grain relative z-20 bg-danfo">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Logo inverted />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-7">
            <a href="#features" className="hidden text-sm font-semibold hover:underline sm:inline">
              Features
            </a>
            <a href="#asoebi" className="hidden text-sm font-semibold hover:underline sm:inline">
              Aso-ebi
            </a>
            <Link to="/app/vendors" className="hidden text-sm font-semibold hover:underline md:inline">
              Vendors
            </Link>
            <Link to="/app" className={buttonClass('ink', 'sm')}>
              Open planner
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="bg-ink text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-8 px-5 py-12 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-white/70">Loud celebrations, calm planning. Made in Lagos, for everywhere we gather.</p>
          </div>
          <p className="tabular text-sm text-white/60">© {new Date().getFullYear()} Ariya · Ẹ ṣé o, thank you for celebrating with us.</p>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}
