# Ariya: event planner

A planner for African celebrations such as traditional weddings, owambe, naming
ceremonies and remembrance services. It covers the guest list, aso-ebi
collection, vendors, the order of events and a budget in local currency.

## What's inside

**Planner** (`/app`, saved in the browser for now): guest list with RSVPs,
budget in naira, vendors, order of events, aso-ebi ledger with WhatsApp share.

**Marketplace** (needs the Supabase backend, see `supabase/README.md`):

| Who | What they can do |
|---|---|
| Buyers | Browse events, buy single or table tickets, add aso-ebi, apply promo codes, pay with Paystack, keep QR tickets, request refunds for postponed events, vote |
| Sellers | Apply with a Paystack-verified bank account; build events with ticket types, early bird, free VIP comps, promo codes, promoter links, custom questions and fee choice; sell aso-ebi; run voting contests; see sales and promoter commissions; refund; postpone or cancel; manage door staff |
| Door staff | Scan QR codes by camera or type the code; keeps working offline and syncs later |
| Admins | Approve or reject sellers, set commission and fees, review flagged payments, send refunds, suspend sellers |

Money never sits with Ariya: Paystack split payments send each seller's share
to their own bank account. See `ROADMAP.md` for the reasoning.

## Stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4 with custom tokens,
Archivo + Bungee (self-hosted), Supabase (Postgres, Auth, Realtime, Storage,
Edge Functions), Paystack, TanStack Query,
React Router (route-level code splitting), Zustand, Vitest.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | Purpose |
|---|---|
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for dates, money, stats, validation, CSV and WhatsApp text |
| `npm run preview` | Serve the production build |

Deploys as a static site. `vercel.json` and `public/_redirects` (Netlify) send
every route to `index.html`.

## Project layout

```
src/
  components/   UI primitives, Motif patterns, EventTicket, EventForm
  data/         Types, catalogues (event types, currencies), sample event, demo vendors
  layouts/      Marketing site shell and planner shell
  lib/          Pure helpers: dates, money, stats, CSV, WhatsApp text (unit tested)
  pages/        Route components; pages/event/* are the event tabs
  store/        Zustand store, persisted to localStorage
```

Design rules are in [DESIGN.md](./DESIGN.md).

## Deploying on Vercel

- `vercel.json` sends every page to the app, except that link-preview bots
  (WhatsApp, Facebook, X, Telegram…) visiting `/e/…` get `api/share.ts`,
  which returns the event's title, date, venue and photo so shared links
  show a proper preview.
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and
  optionally `VITE_SENTRY_DSN` for error alerts (sentry.io, React project).

## Custom domain

1. Buy the domain: `.ng` / `.com.ng` from a NiRA-accredited registrar, or `.com`
   from any registrar.
2. Vercel → your project → **Settings → Domains** → add it, then add the DNS
   records Vercel shows at your registrar. HTTPS is automatic.
3. Update Supabase **Authentication → URL Configuration** (Site URL and
   Redirect URLs) and the `APP_ORIGIN` function secret to the new domain.

## Before a public launch

1. Follow `supabase/README.md` end to end, with Paystack **test** keys first,
   including custom SMTP for sign-in emails.
2. Have a lawyer review `src/pages/legal/legalContent.ts` and fill in the company details.
3. Confirm current Paystack fees and set them in **Admin → Commission & fees**.
4. Make one real purchase, scan it at a door, cancel, and confirm the refund lands.
