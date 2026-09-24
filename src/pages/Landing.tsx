import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EventTicket } from '../components/EventTicket'
import { Motif } from '../components/Motif'
import { Signboard } from '../components/Signboard'
import { buttonClass } from '../components/styles'
import { Meter, Pill, Sticker } from '../components/ui'
import { createSampleEvent } from '../data/sample'
import type { PlannerEvent } from '../data/types'
import { asoebiMessage } from '../lib/asoebi'
import { toDateInput } from '../lib/dates'
import { useDocumentTitle } from '../lib/useDocumentTitle'

/** Painted on the back of every other danfo in Lagos, plus a few of our own. */
const SLOGANS = [
  'No food for lazy man',
  'Owambe no get closing time',
  'God’s time is the best',
  'Jollof must reach everybody',
  'No condition is permanent',
  'Aunty, your aso-ebi don land',
]

const CURRENCIES = ['₦ Naira', 'GH₵ Cedi', 'KSh Shilling', 'R Rand', '$ Dollar']

function previews(): [PlannerEvent, PlannerEvent] {
  const now = new Date()
  const wedding = { ...createSampleEvent(now), id: 'preview-wedding', type: 'white-wedding' as const }
  const owambe: PlannerEvent = {
    ...createSampleEvent(now),
    id: 'preview-owambe',
    title: 'Mummy Bisi @ 60',
    type: 'owambe',
    date: toDateInput(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 19)),
    venue: 'Oriental Garden',
    city: 'Ibadan',
    budget: 7_200_000,
    guestTarget: 300,
  }
  return [wedding, owambe]
}

export default function Landing() {
  useDocumentTitle('')
  const [wedding, owambe] = useMemo(() => previews(), [])
  const message = useMemo(() => asoebiMessage(wedding), [wedding])

  return (
    <>
      {/* HERO */}
      <section className="grain bg-danfo">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-16 px-5 pt-8 pb-28 sm:px-8 lg:grid-cols-12 lg:gap-6 lg:pt-12 lg:pb-28">
          <div className="lg:col-span-7">
            <p className="text-[0.75rem] font-extrabold tracking-[0.16em] uppercase">Trad · White wedding · Owambe · Naming · Send-forth</p>
            <h1 className="font-display mt-6 text-[clamp(2.9rem,12.6vw,4.6rem)] leading-[0.86] sm:text-[clamp(4rem,7.4vw,6.3rem)] uppercase">
              Owambe
              <br />
              without
              <br />
              <span className="mt-2 inline-block -rotate-2 rounded-md bg-ink px-3 pb-1 text-danfo">wahala.</span>
            </h1>
            <p className="mt-9 max-w-[33rem] text-lg leading-relaxed font-medium">
              Guest list, aso-ebi money, vendors and a budget in naira. One app for the whole family planning committee,
              instead of five WhatsApp groups and Mummy’s notebook.
            </p>
            <div className="relative mt-10 flex flex-wrap items-center gap-4">
              <Link to="/app/events/new" className={buttonClass('ink', 'lg')}>
                Start planning <ArrowRight size={19} strokeWidth={2.5} aria-hidden="true" />
              </Link>
              <Link to="/app" className={buttonClass('white', 'lg')}>
                See a sample event
              </Link>
              <Sticker tone="pink" shape="round" className="hidden h-24 w-24 rotate-12 sm:grid">
                <span className="text-xl leading-none">
                  Free
                  <span className="block text-[0.6rem] tracking-wide">to start</span>
                </span>
              </Sticker>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:col-span-5 lg:mt-4 lg:max-w-none">
            <div className="relative lg:h-[40rem]">
              <EventTicket event={wedding} preview className="absolute top-0 right-0 hidden w-[72%] rotate-[5deg] sm:block" />
              <EventTicket event={owambe} preview className="relative w-[94%] -rotate-[3deg] sm:mt-56 sm:w-[78%] lg:absolute lg:top-0 lg:left-0 lg:mt-60" />
            </div>
            <div className="absolute -bottom-20 right-0 w-60 rotate-[3deg] rounded-lg border-2 border-ink bg-white p-4 text-sm shadow-hard lg:-right-2 lg:bottom-2">
              <p className="flex items-center justify-between font-extrabold">
                Uncle Emeka <Pill tone="green">Coming</Pill>
              </p>
              <p className="mt-1.5 text-ink-soft">“I’m coming with 2 people. Put me down for 3 sets of aso-ebi.”</p>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="danfo-stripes" />
      </section>

      {/* SLOGANS */}
      <section aria-label="Danfo slogans" className="overflow-hidden bg-ink py-5 text-danfo">
        <div aria-hidden="true" className="flex w-max animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {SLOGANS.map((s) => (
                <span key={s} className="flex items-center font-sign text-2xl whitespace-nowrap uppercase sm:text-[2.1rem]">
                  <span className="px-6">{s}</span>
                  <span className="text-pink">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <ul className="sr-only">
          {SLOGANS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      {/* FEATURES BENTO */}
      <section id="features" className="mx-auto max-w-[1280px] scroll-mt-6 px-5 pt-24 pb-24 sm:px-8 lg:pt-32">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display max-w-3xl text-[2.5rem] leading-[0.95] sm:text-6xl">
            Everything from the five WhatsApp groups. <em className="hl">Now in one app.</em>
          </h2>
          <p className="max-w-sm font-medium text-ink-soft">
            Built around how we actually plan: committees, aunties, cousins abroad and one tired host.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-6">
          <article className="rounded-lg border-2 border-ink bg-white p-6 shadow-hard sm:p-8 lg:col-span-4">
            <p className="font-sign text-pink">01</p>
            <h3 className="font-display mt-2 text-2xl sm:text-3xl">The guest list that keeps growing</h3>
            <p className="mt-2 max-w-lg text-ink-soft">
              Mummy adds twelve names on Sunday. Daddy adds his whole club on Monday. Track every RSVP and plus-one, then
              export the list for the ushers at the gate.
            </p>
            <ul className="mt-6 divide-y-2 divide-ink rounded-md border-2 border-ink">
              {[
                ['Chief & Mrs Okafor', '+1', 'green', 'Coming'],
                ['Alhaji Musa Bello', '+1', 'neutral', 'Awaiting'],
                ['Aunty Funke', '', 'red', 'Not coming'],
              ].map(([name, plus, tone, label]) => (
                <li key={name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="truncate font-semibold">
                    {name} <span className="text-ink-faint">{plus}</span>
                  </span>
                  <Pill tone={tone as 'green' | 'neutral' | 'red'}>{label}</Pill>
                </li>
              ))}
            </ul>
          </article>

          <article id="asoebi" className="scroll-mt-6 rounded-lg border-2 border-ink bg-pink p-6 shadow-hard sm:p-8 lg:col-span-2">
            <p className="font-sign">02</p>
            <h3 className="font-display mt-2 text-2xl">Aso-ebi money, sorted</h3>
            <p className="mt-2 font-medium">Who ordered, who paid, who collected. No more transfer screenshots.</p>
            <div className="mt-8 flex -space-x-3" aria-hidden="true">
              {['#1f2a5a', '#ffc700', '#ffffff'].map((c) => (
                <span key={c} className="h-14 w-14 rounded-full border-2 border-ink" style={{ background: c }} />
              ))}
            </div>
            <p className="font-sign mt-6 text-5xl leading-none">₦425k</p>
            <p className="mt-1 text-sm font-bold tracking-[0.1em] uppercase">Still owed · 3 people</p>
          </article>

          <article className="rounded-lg border-2 border-ink bg-green p-6 text-white shadow-hard sm:p-8 lg:col-span-2">
            <p className="font-sign text-danfo">03</p>
            <h3 className="font-display mt-2 text-2xl">Vendors, chased</h3>
            <p className="mt-2 text-white/85">See who is only enquired, who is booked and who is still waiting on a deposit.</p>
            <ol className="mt-7 flex flex-col gap-2 text-sm font-bold">
              {[
                ['Harbour Hall', 'Deposit paid'],
                ['Mama Tee’s Pot', 'Booked'],
                ['Gbedu Live Band', 'Enquired'],
              ].map(([v, s]) => (
                <li key={v} className="flex items-center justify-between rounded-md border-2 border-ink bg-white px-3 py-2 text-ink">
                  {v} <span className="text-xs tracking-wide text-ink-soft uppercase">{s}</span>
                </li>
              ))}
            </ol>
          </article>

          <article className="relative overflow-hidden rounded-lg border-2 border-ink bg-ink p-6 text-white shadow-[4px_4px_0_var(--color-danfo)] sm:p-8 lg:col-span-4">
            <Motif kind="checker" color="#ffffff" opacity={0.05} scale={1.4} />
            <div className="relative grid gap-8 sm:grid-cols-2">
              <div>
                <p className="font-sign text-danfo">04</p>
                <h3 className="font-display mt-2 text-2xl sm:text-3xl">A budget in naira, not guesswork</h3>
                <p className="mt-2 text-white/75">Planned against paid, line by line. See it the moment small chops quietly doubles.</p>
                <p className="font-sign mt-8 text-4xl text-danfo sm:text-5xl">₦18.5M</p>
              </div>
              <ul className="flex flex-col justify-end gap-4">
                {[
                  ['Food & catering', 1_500_000, 4_200_000],
                  ['Venue', 2_000_000, 4_000_000],
                  ['Décor & lighting', 1_400_000, 2_800_000],
                  ['Music, DJ & MC', 600_000, 1_800_000],
                ].map(([label, paid, planned]) => (
                  <li key={label as string}>
                    <p className="mb-1.5 flex justify-between text-sm font-semibold">
                      {label} <span className="tabular text-white/60">{Math.round(((paid as number) / (planned as number)) * 100)}%</span>
                    </p>
                    <Meter value={paid as number} max={planned as number} tone="danfo" label={`${label} paid`} />
                  </li>
                ))}
              </ul>
            </div>
          </article>
        </div>
      </section>

      {/* WHATSAPP SHARE */}
      <section className="border-y-2 border-ink bg-white">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-center gap-14 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-28">
          <div className="lg:col-span-5">
            <Sticker tone="danfo" className="-rotate-2 text-sm">One tap</Sticker>
            <h2 className="font-display mt-6 text-[2.5rem] leading-[0.95] sm:text-6xl">Send the aso-ebi to the family group.</h2>
            <p className="mt-5 max-w-md font-medium text-ink-soft">
              Fabric, price per set and the account number go out as a ready-made WhatsApp message. People reply, you
              tick them off.
            </p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <div className="relative mx-auto max-w-md rounded-lg border-2 border-ink bg-paper-2 p-5 shadow-hard-lg sm:p-7">
              <p className="text-center text-xs font-bold tracking-[0.14em] text-ink-faint uppercase">Okafor & Adeyemi family ❤</p>
              <div className="mt-5 ml-auto w-[88%] rounded-lg rounded-tr-none border-2 border-ink bg-danfo-soft p-4 text-[0.92rem] leading-relaxed whitespace-pre-line">
                {message.replace(/\*/g, '')}
              </div>
              <div className="mt-3 w-[70%] rounded-lg rounded-tl-none border-2 border-ink bg-white p-3 text-[0.92rem]">
                Adaeze, put me down for 4 sets. Transfer done ✅
                <p className="mt-1 text-xs font-semibold text-ink-faint">Mrs Ngozi Obi</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIGNBOARD QUOTE */}
      <section className="mx-auto max-w-[1280px] px-5 py-28 sm:px-8 lg:py-36">
        <Signboard tone="ink" className="mx-auto max-w-4xl -rotate-1 px-8 py-12 shadow-hard-lg sm:px-14 sm:py-16">
          <p className="font-sign text-center text-[clamp(1.9rem,5vw,4rem)] leading-[1.02] uppercase">
            Party no dey sweet if planning no set
          </p>
        </Signboard>
        <p className="mt-8 text-center font-semibold text-ink-soft">
          Every Lagos aunty, ever. <span className="text-ink-faint">(A party is only as sweet as its planning.)</span>
        </p>
      </section>

      {/* CTA */}
      <section className="grain bg-danfo">
        <div aria-hidden="true" className="danfo-stripes" />
        <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:py-28">
          <h2 className="font-display max-w-4xl text-[2.6rem] leading-[0.9] uppercase sm:text-7xl">Your next owambe starts here.</h2>
          <p className="mt-6 max-w-xl text-lg font-medium">
            Lagos to London, Accra to Houston. Plan in your own currency. Everything saves on your phone, so you can
            start right now.
          </p>
          <ul className="mt-8 flex flex-wrap gap-3" aria-label="Supported currencies">
            {CURRENCIES.map((c, i) => (
              <li key={c}>
                <Sticker tone={i % 2 ? 'white' : 'ink'} className={`text-sm ${i % 2 ? 'rotate-2' : '-rotate-2'}`}>
                  {c}
                </Sticker>
              </li>
            ))}
          </ul>
          <Link to="/app/events/new" className={buttonClass('ink', 'lg', 'mt-12')}>
            Plan my event <ArrowRight size={19} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
