import { Link } from 'react-router-dom'
import { Motif } from '../components/Motif'
import { buttonClass } from '../components/styles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-indigo px-6 text-paper">
      <Motif kind="oniko" color="#d99a2b" opacity={0.25} />
      <div className="relative max-w-lg text-center">
        <p className="font-serif text-[9rem] leading-none italic text-ochre">404</p>
        <h1 className="mt-2 text-2xl font-semibold">This party has moved venue.</h1>
        <p className="mt-2 text-paper/75">The page you wanted is not here. Your events are safe.</p>
        <Link to="/app" className={buttonClass('paper', 'md', 'mt-8')}>
          Go to my events
        </Link>
      </div>
    </main>
  )
}
