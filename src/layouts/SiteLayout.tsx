import { Link, Outlet, ScrollRestoration } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { buttonClass } from '../components/styles'

export function SiteLayout() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <header className="relative z-20">
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-5 sm:px-8">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-6">
            <a href="#how" className="hidden text-sm text-ink-soft hover:text-ink sm:inline">
              How it works
            </a>
            <a href="#asoebi" className="hidden text-sm text-ink-soft hover:text-ink sm:inline">
              Aso-ebi
            </a>
            <Link to="/app/vendors" className="hidden text-sm text-ink-soft hover:text-ink md:inline">
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
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-5 py-10 text-sm text-ink-soft sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs">A calm planner for loud, beautiful celebrations. Made in Lagos.</p>
          </div>
          <p className="tabular">© {new Date().getFullYear()} Ariya. Ẹ ṣé o, thank you for celebrating with us.</p>
        </div>
      </footer>
      <ScrollRestoration />
    </>
  )
}
