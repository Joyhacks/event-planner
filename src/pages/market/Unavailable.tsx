import { Link } from 'react-router-dom'
import { buttonClass } from '../../components/styles'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

export default function Unavailable() {
  useDocumentTitle('Ticketing coming soon')
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <h1 className="font-display text-3xl">Ticketing is not open yet</h1>
      <p className="mt-4">You can use Ariya to plan your celebration, manage guests and track your budget today.</p>
      <Link to="/app" className={buttonClass('ink', 'md', 'mt-6')}>
        Open the planner
      </Link>
    </section>
  )
}
