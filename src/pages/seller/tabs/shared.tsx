import type { ReactNode } from 'react'

export function Panel({ title, children, tone = 'card' }: { title: string; children: ReactNode; tone?: 'card' | 'soft' }) {
  return (
    <section className={`rounded-lg border-2 border-ink p-5 shadow-hard sm:p-6 ${tone === 'soft' ? 'bg-danfo-soft' : 'bg-card'}`}>
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
      {message}
    </p>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border-2 border-dashed border-line-strong px-4 py-6 text-center text-sm font-medium text-ink-soft">{children}</p>
}
