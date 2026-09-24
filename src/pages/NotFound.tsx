import { Link } from 'react-router-dom'
import { Signboard } from '../components/Signboard'
import { buttonClass } from '../components/styles'
import { useDocumentTitle } from '../lib/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <main className="grain grid min-h-screen place-items-center bg-danfo px-5">
      <div className="max-w-lg text-center">
        <Signboard tone="ink" className="mx-auto inline-block -rotate-2 px-10 py-6 shadow-hard-lg">
          <p className="font-sign text-[6rem] leading-none sm:text-[8rem]">404</p>
        </Signboard>
        <h1 className="font-display mt-10 text-3xl sm:text-4xl">This party don change venue.</h1>
        <p className="mt-3 font-medium">The page you wanted is not here. Your events are safe.</p>
        <Link to="/app" className={buttonClass('ink', 'lg', 'mt-8')}>
          Go to my events
        </Link>
      </div>
    </main>
  )
}
