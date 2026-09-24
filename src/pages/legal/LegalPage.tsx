import { Navigate, useParams } from 'react-router-dom'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { LEGAL } from './legalContent'

export default function LegalPage() {
  const { doc = '' } = useParams()
  const page = LEGAL[doc as keyof typeof LEGAL]
  useDocumentTitle(page?.title ?? 'Legal')
  if (!page) return <Navigate to="/legal/terms" replace />
  return (
    <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <h1 className="font-display text-[2.4rem] leading-[0.95] sm:text-5xl">{page.title}</h1>
      <p className="mt-3 text-sm font-semibold text-ink-soft">Last updated {page.updated}</p>
      {page.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="font-display text-xl">{s.heading}</h2>
          {s.body.map((p) => (
            <p key={p.slice(0, 40)} className="mt-3 leading-relaxed font-medium">
              {p}
            </p>
          ))}
        </section>
      ))}
    </article>
  )
}
