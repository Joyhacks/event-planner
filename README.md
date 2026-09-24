# Ariya: event planner

A planner for African celebrations such as traditional weddings, owambe, naming
ceremonies and remembrance services. It covers the guest list, aso-ebi
collection, vendors, the order of events and a budget in local currency.

## What's inside

| Area | What it does |
|---|---|
| Landing page | Marketing page at `/` |
| My events | Countdown to the next event, all events shown as tickets |
| Event overview | Summary numbers and suggested next steps; edit or delete the event |
| Guests | RSVP tracking, plus-ones, filters, search, CSV export for the gate |
| Budget | Planned vs paid per line, inline editing, category breakdown, over-budget warning |
| Vendors | Shortlist from the directory and track status from enquired to fully paid |
| Order of events | Timeline for the MC, DJ and caterer |
| Aso-ebi | Fabric, price and colours; who paid and who collected; share to WhatsApp |

Data is saved in the browser (localStorage) for now. See *Next steps*.

## Stack

React 19, TypeScript (strict), Vite, Tailwind CSS v4 with custom tokens,
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

## Next steps before a public launch

1. **Accounts and a real database** (e.g. Supabase) so a planning committee can share one event across phones. Every table needs row-level security scoped to the event's members.
2. **Real vendor directory.** The listings in `src/data/vendors.ts` are demo data and are labelled as such in the UI.
3. **Guest RSVP link** so guests can reply themselves.
4. **Paystack or Flutterwave** for aso-ebi payments, with verified webhooks.
5. Analytics and error monitoring (for example Sentry).
