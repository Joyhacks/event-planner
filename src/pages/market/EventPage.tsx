import { useQuery } from '@tanstack/react-query'
import { CalendarPlus, Link2, MapPin, MessageCircle, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Motif } from '../../components/Motif'
import { BackendMissing } from '../../components/RequireAuth'
import { PageLoader } from '../../components/RouteStates'
import { Stepper } from '../../components/Stepper'
import { buttonClass } from '../../components/styles'
import { Button, Field, Input, Pill, Select } from '../../components/ui'
import { useAuth } from '../../lib/authContext'
import { downloadFile } from '../../lib/csv'
import { CATEGORY_LABEL, fetchEventBySlug, ticketAvailability, type EventBundle } from '../../lib/market'
import { naira } from '../../lib/money'
import { backendReady, errorMessage, supabase } from '../../lib/supabase'
import type { OrderQuote } from '../../lib/types'
import { useDocumentTitle } from '../../lib/useDocumentTitle'
import { formatCountdown, useNow } from '../../lib/useNow'
import { formatWhen, icsFor } from '../../lib/when'

type Cart = Record<string, number>

export default function EventPage() {
  const { slug = '' } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['event', slug],
    enabled: backendReady,
    queryFn: () => fetchEventBySlug(slug),
  })
  useDocumentTitle(data?.event.title ?? 'Event')

  if (!backendReady) return <BackendMissing />
  if (isLoading) return <PageLoader />
  if (!data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <p className="font-sign text-5xl text-pink">Hmm.</p>
        <h1 className="font-display mt-4 text-2xl">We can’t find that event.</h1>
        <Link to="/events" className={buttonClass('ink', 'md', 'mt-8')}>
          See all events
        </Link>
      </div>
    )
  }
  return <EventView bundle={data} />
}

function EventView({ bundle }: { bundle: EventBundle }) {
  const { event, contests } = bundle
  const [params] = useSearchParams()
  const refKey = `ariya-ref-${event.id}`

  // Remember a promoter's link for this event for the rest of the visit.
  useEffect(() => {
    const ref = params.get('ref')
    try {
      if (ref) sessionStorage.setItem(refKey, ref)
    } catch {
      /* storage blocked: the ref just won't persist */
    }
  }, [params, refKey])

  const onSale = event.status === 'published' || event.status === 'postponed'
  const url = `${window.location.origin}/e/${event.slug}`
  const share = `${event.title} · ${formatWhen(event.starts_at)} · ${event.city}\n${url}`

  return (
    <div>
      <section className="relative overflow-hidden border-b-2 border-ink bg-ink text-white">
        {event.cover_url ? (
          <>
            <img src={event.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
          </>
        ) : (
          <Motif kind="checker" color="#ffc700" opacity={0.08} scale={1.6} />
        )}
        <div className="relative mx-auto max-w-[1280px] px-5 pt-16 pb-10 sm:px-8 lg:pt-28">
          <p className="flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-white bg-danfo px-3 py-0.5 text-[0.7rem] font-extrabold tracking-[0.12em] text-ink uppercase">
              {CATEGORY_LABEL[event.category] ?? event.category}
            </span>
            {event.sellers && (
              <span className="rounded-full border-2 border-white/60 px-3 py-0.5 text-[0.7rem] font-bold tracking-[0.08em] uppercase">
                By {event.sellers.display_name}
              </span>
            )}
          </p>
          <h1 className="font-display mt-5 max-w-4xl text-[2.6rem] leading-[0.92] sm:text-7xl">{event.title}</h1>
          <p className="mt-5 text-lg font-bold text-danfo">{formatWhen(event.starts_at)}</p>
          <p className="font-medium text-white/85">{[event.venue, event.address, event.city].filter(Boolean).join(', ')}</p>
        </div>
      </section>

      {event.status !== 'published' && (
        <div role="status" className={`border-b-2 border-ink px-5 py-4 text-center font-bold ${event.status === 'cancelled' ? 'bg-red text-white' : 'bg-pink'}`}>
          {event.status === 'postponed' && `Postponed: new date ${formatWhen(event.starts_at)}. `}
          {event.status === 'cancelled' && 'This event was cancelled. Ticket holders are being refunded automatically. '}
          {event.status === 'ended' && 'This event has ended. '}
          {event.status_note}
        </div>
      )}

      <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="flex flex-wrap gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" className={buttonClass('outline', 'sm')}>
              <MessageCircle size={15} aria-hidden="true" /> Share on WhatsApp
            </a>
            <Button variant="outline" size="sm" onClick={() => void navigator.clipboard?.writeText(url)}>
              <Link2 size={15} aria-hidden="true" /> Copy link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadFile(`${event.slug}.ics`, icsFor({ ...event, url }), 'text/calendar;charset=utf-8')}
            >
              <CalendarPlus size={15} aria-hidden="true" /> Add to calendar
            </Button>
            {(event.venue || event.address) && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([event.venue, event.address, event.city].filter(Boolean).join(', '))}`}
                target="_blank"
                rel="noreferrer"
                className={buttonClass('outline', 'sm')}
              >
                <MapPin size={15} aria-hidden="true" /> Directions
              </a>
            )}
          </div>

          {event.description && (
            <div className="mt-10 max-w-2xl text-[1.05rem] leading-relaxed font-medium whitespace-pre-line">{event.description}</div>
          )}

          {contests.map((c) => (
            <Link
              key={c.id}
              to={`/e/${event.slug}/vote`}
              className="mt-10 flex items-center gap-4 rounded-lg border-2 border-ink bg-pink p-5 shadow-hard transition-transform hover:-translate-y-0.5"
            >
              <Trophy size={28} strokeWidth={2.25} aria-hidden="true" />
              <span>
                <span className="font-display block text-xl">{c.title}</span>
                <span className="text-sm font-bold">See the leaderboard and vote</span>
              </span>
            </Link>
          ))}
        </div>

        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-6">
            {onSale ? (
              <Purchase bundle={bundle} refKey={refKey} />
            ) : (
              <p className="rounded-lg border-2 border-ink bg-card p-6 font-bold shadow-hard">Tickets are not on sale.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Purchase({ bundle, refKey }: { bundle: EventBundle; refKey: string }) {
  const { event, ticketTypes, asoebi } = bundle
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const now = useNow(30_000)
  const [cart, setCart] = useState<Cart>({})
  const [step, setStep] = useState<'pick' | 'details' | 'review'>('pick')
  const [promo, setPromo] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quote, setQuote] = useState<OrderQuote | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const buyable = ticketTypes.filter((t) => t.kind !== 'entry')
  const entries = ticketTypes.filter((t) => t.kind === 'entry')
  const items = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, n]) => n > 0)
        .map(([key, quantity]) => {
          const [kind, id] = key.split(':')
          return kind === 'a' ? { asoebi_item_id: id, quantity } : { ticket_type_id: id, quantity }
        }),
    [cart],
  )
  const estimate = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [key, n]) => {
        const [kind, id] = key.split(':')
        const price = kind === 'a' ? asoebi.find((a) => a.id === id)?.price_kobo : ticketTypes.find((t) => t.id === id)?.price_kobo
        return sum + (price ?? 0) * n
      }, 0),
    [cart, asoebi, ticketTypes],
  )
  const hasEntry = entries.some((t) => (cart[`t:${t.id}`] ?? 0) > 0)

  const continueToDetails = () => {
    if (!user) {
      navigate(`/signin?next=${encodeURIComponent(`/e/${event.slug}`)}`)
      return
    }
    setName((n) => n || profile?.full_name || '')
    setStep('details')
  }

  const createOrder = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    let ref: string | null
    try {
      ref = sessionStorage.getItem(refKey)
    } catch {
      ref = null
    }
    const { data, error: err } = await supabase.rpc('create_order', {
      p_event: event.id,
      p_items: items,
      p_buyer_name: name,
      p_buyer_phone: phone,
      p_answers: answers,
      p_promo: promo || null,
      p_ref: ref,
    })
    setBusy(false)
    if (err) return setError(await errorMessage(err))
    const q = data as OrderQuote
    if (q.free) return navigate('/account/tickets?new=1')
    setQuote(q)
    setStep('review')
  }

  const pay = async () => {
    if (!quote) return
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.functions.invoke('checkout', {
      body: { reference: quote.reference, callback_url: `${window.location.origin}/checkout/return` },
    })
    if (err) {
      setBusy(false)
      return setError(await errorMessage(err))
    }
    window.location.assign(data.authorization_url)
  }

  return (
    <div className="overflow-hidden rounded-lg border-2 border-ink bg-card shadow-hard">
      <div className="border-b-2 border-ink bg-danfo px-5 py-3">
        <h2 className="font-display text-xl">{step === 'review' ? 'Review & pay' : 'Get tickets'}</h2>
      </div>

      {step === 'pick' && (
        <div className="p-5">
          {buyable.length === 0 && entries.length === 0 && asoebi.length === 0 && (
            <p className="font-medium text-ink-soft">The organiser has not added tickets yet.</p>
          )}
          <ul className="flex flex-col gap-4">
            {[...buyable, ...entries].map((t) => {
              const a = ticketAvailability(t, now)
              const key = `t:${t.id}`
              const max = t.kind === 'entry' ? 1 : Math.min(t.max_per_order, a.left)
              return (
                <li key={t.id} className="flex items-start justify-between gap-4 border-b-2 border-dashed border-line pb-4 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-bold">{t.name}</p>
                    <p className="font-sign text-lg">{t.price_kobo === 0 ? 'Free' : naira(t.price_kobo)}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {t.kind === 'table' && <Pill tone="blue">Table for {t.seats}</Pill>}
                      {t.kind === 'entry' && <Pill tone="pink">Contest entry</Pill>}
                      {a.state === 'on' && t.sale_ends_at && <Pill tone="danfo">Ends in {formatCountdown(Date.parse(t.sale_ends_at) - now)}</Pill>}
                      {a.state === 'on' && a.left <= 20 && <Pill tone="red">{a.left} left</Pill>}
                    </p>
                    {t.description && <p className="mt-1 text-sm text-ink-soft">{t.description}</p>}
                  </div>
                  <div className="shrink-0">
                    {a.state === 'on' ? (
                      <Stepper value={cart[key] ?? 0} max={max} label={t.name} onChange={(n) => setCart((c) => ({ ...c, [key]: n }))} />
                    ) : (
                      <Pill tone="neutral">{a.state === 'soldout' ? 'Sold out' : a.state === 'soon' ? 'Soon' : 'Ended'}</Pill>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>

          {asoebi.length > 0 && (
            <>
              <h3 className="font-display mt-6 border-t-2 border-ink pt-4 text-lg">Aso-ebi</h3>
              <ul className="mt-3 flex flex-col gap-4">
                {asoebi.map((a) => {
                  const left = Math.max(0, a.stock - a.sold)
                  const key = `a:${a.id}`
                  return (
                    <li key={a.id} className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <span className="flex shrink-0 -space-x-2 pt-1" aria-hidden="true">
                          {(a.colors.length ? a.colors : ['#d9d6cb']).map((c) => (
                            <span key={c} className="h-6 w-6 rounded-full border-2 border-ink" style={{ background: c }} />
                          ))}
                        </span>
                        <div>
                          <p className="font-bold">{a.name}</p>
                          <p className="font-sign">{naira(a.price_kobo)}</p>
                          {left <= 10 && <p className="text-xs font-bold text-red">{left} left</p>}
                        </div>
                      </div>
                      {left > 0 ? (
                        <Stepper value={cart[key] ?? 0} max={Math.min(left, 20)} label={a.name} onChange={(n) => setCart((c) => ({ ...c, [key]: n }))} />
                      ) : (
                        <Pill tone="neutral">Sold out</Pill>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <div className="mt-6 border-t-2 border-ink pt-4">
            <Field label="Promo code (optional)">
              {(p) => <Input {...p} value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} autoComplete="off" />}
            </Field>
            <p className="mt-4 flex items-baseline justify-between font-bold">
              <span>Subtotal</span>
              <span className="font-sign text-xl">{naira(estimate)}</span>
            </p>
            <p className="text-xs text-ink-soft">
              {event.fee_bearer === 'buyer' ? 'A small payment fee is added at checkout.' : 'No extra fees at checkout.'}
            </p>
            <Button variant="ink" size="lg" className="mt-4 w-full" disabled={items.length === 0} onClick={continueToDetails}>
              {user ? 'Continue' : 'Sign in to continue'}
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && (
        <form onSubmit={createOrder} noValidate className="flex flex-col gap-4 p-5">
          <Field label="Name on the ticket">
            {(p) => <Input {...p} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />}
          </Field>
          <Field label="Phone (optional)" hint="So the organiser can reach you if plans change.">
            {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />}
          </Field>
          {event.form_fields.map((f) => (
            <Field key={f.id} label={`${f.label}${f.required ? '' : ' (optional)'}`}>
              {(p) =>
                f.type === 'select' ? (
                  <Select {...p} value={answers[f.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [f.id]: e.target.value }))}>
                    <option value="">Choose…</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input {...p} value={answers[f.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [f.id]: e.target.value }))} />
                )
              }
            </Field>
          ))}
          {hasEntry && (
            <>
              <Field label="Contestant bio" hint="Shown on your contestant page. Keep it short and sweet.">
                {(p) => <Input {...p} value={answers.bio ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, bio: e.target.value }))} />}
              </Field>
              <PhotoUpload onUploaded={(u) => setAnswers((a) => ({ ...a, photo_url: u }))} value={answers.photo_url} />
            </>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('pick')}>
              Back
            </Button>
            <Button type="submit" variant="ink" className="flex-1" disabled={busy}>
              {busy ? 'Holding your tickets…' : 'Continue to payment'}
            </Button>
          </div>
        </form>
      )}

      {step === 'review' && quote && <Review quote={quote} busy={busy} error={error} onPay={pay} onBack={() => setStep('pick')} />}
    </div>
  )
}

function Review({ quote, busy, error, onPay, onBack }: { quote: OrderQuote; busy: boolean; error: string; onPay: () => void; onBack: () => void }) {
  const now = useNow()
  const left = Date.parse(quote.expires_at) - now
  return (
    <div className="p-5">
      <dl className="flex flex-col gap-2 font-medium">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd className="tabular">{naira(quote.subtotal_kobo)}</dd>
        </div>
        {quote.discount_kobo > 0 && (
          <div className="flex justify-between text-green">
            <dt>Promo discount</dt>
            <dd className="tabular">−{naira(quote.discount_kobo)}</dd>
          </div>
        )}
        {quote.buyer_fee_kobo > 0 && (
          <div className="flex justify-between">
            <dt>Payment fee</dt>
            <dd className="tabular">{naira(quote.buyer_fee_kobo)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t-2 border-ink pt-3 font-bold">
          <dt>Total</dt>
          <dd className="font-sign text-2xl">{naira(quote.total_kobo)}</dd>
        </div>
      </dl>
      <p className={`mt-4 rounded-md px-3 py-2 text-sm font-bold ${left > 0 ? 'bg-danfo-soft' : 'bg-red-soft text-red'}`} role="status">
        {left > 0 ? `Your tickets are held for ${formatCountdown(left)}` : 'Your hold has expired. Go back and try again.'}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-md bg-red-soft px-3 py-2 text-sm font-bold text-red">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="danfo" size="lg" className="flex-1" onClick={onPay} disabled={busy || left <= 0}>
          {busy ? 'Opening Paystack…' : `Pay ${naira(quote.total_kobo)}`}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-ink-soft">Secure card, bank transfer or USSD payment by Paystack.</p>
    </div>
  )
}

export function PhotoUpload({ onUploaded, value }: { onUploaded: (url: string) => void; value?: string }) {
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const upload = async (file: File) => {
    if (!user) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setStatus('Use a JPG, PNG or WebP photo.')
    if (file.size > 5 * 1024 * 1024) return setStatus('Photos must be under 5 MB.')
    setStatus('Uploading…')
    const path = `${user.id}/${crypto.randomUUID()}.${file.type.split('/')[1]}`
    const { error } = await supabase.storage.from('media').upload(path, file, { contentType: file.type, upsert: false })
    if (error) return setStatus(await errorMessage(error))
    onUploaded(supabase.storage.from('media').getPublicUrl(path).data.publicUrl)
    setStatus('Uploaded')
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[0.72rem] font-bold tracking-[0.12em] uppercase">Photo</span>
      <div className="flex items-center gap-3">
        {value && <img src={value} alt="Uploaded" className="h-14 w-14 rounded-md border-2 border-ink object-cover" />}
        <label className={buttonClass('outline', 'sm', 'cursor-pointer')}>
          {value ? 'Change photo' : 'Upload photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
        </label>
        {status && <span className="text-sm font-medium text-ink-soft">{status}</span>}
      </div>
    </div>
  )
}
