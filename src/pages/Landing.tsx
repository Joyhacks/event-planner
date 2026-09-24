import { ArrowRight, Check } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EventTicket } from '../components/EventTicket'
import { Motif } from '../components/Motif'
import { Eyebrow } from '../components/ui'
import { buttonClass } from '../components/styles'
import { createSampleEvent } from '../data/sample'
import type { PlannerEvent } from '../data/types'
import { toDateInput } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { useDocumentTitle } from '../lib/useDocumentTitle'

const OCCASIONS = [
  'Traditional weddings',
  'Owambe',
  'Naming ceremonies',
  'Send-forths',
  '50th birthdays',
  'Remembrance services',
  'House warmings',
  'Product launches',
]

const PAINS = [
  {
    title: 'The guest list that keeps growing',
    body: 'Mummy adds twelve names on Sunday, Daddy adds his whole club on Monday. Track every invite, plus-one and RSVP in one list, then export it for the ushers at the gate.',
  },
  {
    title: 'Aso-ebi money, sorted',
    body: 'Who ordered, who paid, who has collected. Send the fabric, price and account number to WhatsApp in one tap and stop scrolling through transfer screenshots.',
  },
  {
    title: 'Vendors who need chasing',
    body: 'Caterer, décor, band, MC, photographer. See who has only been asked, who is booked and who is still waiting on a deposit.',
  },
  {
    title: 'A budget in naira, not guesswork',
    body: 'Planned against paid, line by line. The moment small chops quietly doubles, you will see it before it eats the drinks money.',
  },
]

const FABRIC_BOLTS = [
  { bg: '#1f2a5a', accent: '#d99a2b', motif: 'oniko' as const, name: 'Indigo adire' },
  { bg: '#d99a2b', accent: '#1b1612', motif: 'kente' as const, name: 'Ochre aso-oke' },
  { bg: '#b0412a', accent: '#f5e3bd', motif: 'eleko' as const, name: 'Camwood' },
]

function owambePreview(): PlannerEvent {
  const now = new Date()
  const base = createSampleEvent(now)
  return {
    ...base,
    id: 'preview-owambe',
    title: "Mummy Bisi's 60th",
    type: 'owambe',
    date: toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 19)),
    venue: 'Oriental Garden',
    city: 'Ibadan',
    budget: 7_200_000,
    guestTarget: 300,
  }
}

export default function Landing() {
  useDocumentTitle('')
  const [wedding, owambe] = useMemo(() => [createSampleEvent(), owambePreview()], [])

  return (
    <>
      {/* HERO */}
      <section className="relative mx-auto max-w-[1240px] px-5 pt-6 pb-24 sm:px-8 lg:pt-14 lg:pb-32">
        <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <Eyebrow>For weddings, owambe &amp; every celebration in between</Eyebrow>
            <h1 className="mt-6 font-serif text-[clamp(3.4rem,9vw,7.6rem)] leading-[0.88] tracking-[-0.02em]">
              Plan the owambe.
              <br />
              <em className="text-clay">Skip the wahala.</em>
            </h1>
            <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-ink-soft">
              Guest list, aso-ebi, vendors and a budget in naira. One calm place for the family planning committee,
              instead of five WhatsApp groups and a notebook.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/app/events/new" className={buttonClass('clay', 'lg')}>
                Start planning, it’s free <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/app" className={buttonClass('outline', 'lg')}>
                See a sample event
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-soft">
              {['No sign-up to try', 'Works on any phone', '₦ · GH₵ · KSh · R'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check size={15} className="text-palm" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="relative mx-auto w-full max-w-[400px] pb-20 sm:max-w-[460px] lg:col-span-5 lg:max-w-none lg:pb-0"
            aria-label="Example event tickets"
          >
            <div className="relative lg:h-[36rem]">
              <EventTicket
                event={owambe}
                preview
                className="absolute top-0 right-0 hidden w-[74%] rotate-[6deg] sm:block"
              />
              <EventTicket
                event={wedding}
                preview
                className="relative w-[92%] -rotate-[3deg] sm:mt-40 sm:w-[80%] lg:absolute lg:top-0 lg:left-0 lg:mt-44"
              />
            </div>
            <div className="absolute right-0 bottom-0 w-60 rotate-[2deg] rounded-sm border border-line bg-ochre-soft px-4 py-3 text-sm shadow-lift lg:right-[2%] lg:bottom-6">
              <p className="font-medium">Uncle Emeka replied</p>
              <p className="text-ink-soft">Coming, with 2 guests · 3 sets of aso-ebi</p>
            </div>
          </div>
        </div>
      </section>

      {/* OCCASIONS MARQUEE */}
      <section aria-label="Occasions Ariya plans" className="relative overflow-hidden bg-indigo py-7 text-paper">
        <Motif kind="oniko" color="#d99a2b" opacity={0.18} />
        <ul className="sr-only">
          {OCCASIONS.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <div aria-hidden="true" className="relative flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {OCCASIONS.map((o) => (
                <span key={o} className="flex items-center font-serif text-4xl whitespace-nowrap italic sm:text-5xl">
                  <span className="px-7">{o}</span>
                  <span className="text-2xl text-ochre not-italic">✺</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-[1240px] scroll-mt-10 px-5 pt-28 pb-20 sm:px-8 lg:pt-36">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:sticky lg:top-12 lg:col-span-5 lg:self-start">
            <Eyebrow>What usually goes wrong</Eyebrow>
            <h2 className="mt-5 font-serif text-5xl leading-[0.95] sm:text-6xl">
              Everything that normally lives in <em className="text-clay">five WhatsApp groups.</em>
            </h2>
            <p className="mt-6 max-w-sm text-ink-soft">
              Ariya was shaped around how celebrations actually get planned here: by committees, aunties, cousins in
              the diaspora and one exhausted host.
            </p>
          </div>
          <ol className="lg:col-span-6 lg:col-start-7">
            {PAINS.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-line py-9 last:border-b sm:grid-cols-[6rem_1fr]">
                <span className="tabular font-serif text-5xl leading-none text-clay sm:text-6xl">0{i + 1}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.01em]">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ASO-EBI */}
      <section id="asoebi" className="scroll-mt-4 bg-ink text-paper">
        <div className="mx-auto grid max-w-[1240px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
          <div className="flex items-end gap-3 sm:gap-5 lg:col-span-6" aria-hidden="true">
            {FABRIC_BOLTS.map((f, i) => (
              <div key={f.name} className="flex-1">
                <div
                  className="relative overflow-hidden rounded-xs"
                  style={{ background: f.bg, height: `${[20, 26, 17][i]}rem` }}
                >
                  <Motif kind={f.motif} color={f.accent} opacity={0.55} scale={1.2} />
                </div>
                <p className="mt-3 text-xs tracking-wider text-paper/60 uppercase">{f.name}</p>
              </div>
            ))}
          </div>

          <div className="lg:col-span-5 lg:col-start-8 lg:self-center">
            <Eyebrow className="!text-ochre">Aso-ebi, handled</Eyebrow>
            <h2 className="mt-5 font-serif text-5xl leading-[0.95] sm:text-6xl">
              Everybody in the same fabric. <em className="text-ochre">Nobody owing.</em>
            </h2>
            <p className="mt-6 text-paper/75">
              Set the fabric and the price per set, then tick people off as they pay and collect. You always know what
              is still owed.
            </p>
            <table className="mt-10 w-full text-left text-sm">
              <caption className="sr-only">Example aso-ebi ledger</caption>
              <thead className="text-[0.7rem] tracking-wider text-paper/50 uppercase">
                <tr>
                  <th scope="col" className="pb-3 font-medium">Name</th>
                  <th scope="col" className="pb-3 font-medium">Sets</th>
                  <th scope="col" className="pb-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {[
                  ['Mummy Bisi', 2, 'Collected'],
                  ['Uncle Emeka', 3, 'Paid'],
                  ['Mrs Ngozi Obi', 4, 'Owes ' + formatMoney(340_000, 'NGN')],
                ].map(([name, sets, status]) => (
                  <tr key={name} className="border-t border-paper/15">
                    <td className="py-3">{name}</td>
                    <td className="py-3">{sets}</td>
                    <td className={`py-3 text-right ${String(status).startsWith('Owes') ? 'text-ochre' : 'text-paper/80'}`}>
                      {status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="mx-auto max-w-[1240px] px-5 py-28 sm:px-8 lg:py-40">
        <figure className="lg:ml-[16%] lg:max-w-4xl">
          <blockquote className="font-serif text-[clamp(2.6rem,6.5vw,5.6rem)] leading-[0.95] tracking-[-0.01em]">
            “Party no dey sweet if <em className="text-clay">planning</em> no set.”
          </blockquote>
          <figcaption className="mt-6 text-ink-soft">
            Every Lagos aunty, ever. <span className="text-ink-faint">(A party is only as sweet as its planning.)</span>
          </figcaption>
        </figure>
      </section>

      {/* CURRENCY + CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-sm bg-ochre px-6 py-16 sm:px-14 lg:py-20">
          <Motif kind="kente" color="#1b1612" opacity={0.08} scale={1.6} />
          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <h2 className="font-serif text-5xl leading-[0.95] sm:text-7xl">Your next celebration starts here.</h2>
              <p className="mt-5 max-w-lg text-ink/80">
                Lagos to London, Accra to Houston. Plan in naira, cedis, shillings, rand or dollars. Everything saves on
                your device, so you can start right now.
              </p>
            </div>
            <div className="lg:col-span-4 lg:justify-self-end">
              <Link to="/app/events/new" className={buttonClass('ink', 'lg')}>
                Plan my event <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
