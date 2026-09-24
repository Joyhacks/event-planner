# Ariya roadmap

Ariya grows from a private planner into a marketplace for ticketed parties and
voting contests. Each phase ships and is tested before the next begins.

## Decisions (September 2026)

| Topic | Decision | Why |
|---|---|---|
| Payments | Paystack split payments with a subaccount per seller | The seller's share settles straight to their bank. The platform never holds seller money, which in Nigeria would need a CBN Mobile Money Operator licence. |
| Seller "wallet" | Earnings ledger (sales, commission, settled) rather than stored balance | Same reason as above |
| Free votes | One per phone-verified account (OTP) | Nigerian mobile networks share IP addresses (CGNAT), so one-per-IP would block whole networks after a single vote |
| Paid contests | Organisers confirm they hold any permit their state requires | Promotional competitions are regulated by state gaming authorities (e.g. LSLGA in Lagos). Get legal advice before launch. |
| Ownership | Company registered with CAC; Paystack business account in the company name | Two co-founders; keeps money and IP with the business |

## Phases

| Phase | Scope | Status |
|---|---|---|
| A1 | Profiles, roles (`user`, `seller`, `super_admin`), shared planner schema, RLS + tests | Done |
| A2 | Create Supabase project, run migrations, set Vercel env vars | Next |
| A3 | Sign-in (email magic link), account menu | |
| A4 | Planner reads and writes Supabase; invite committee members | |
| B | Seller application funnel and admin approval dashboard | |
| C | Public ticketed events: ticket types, custom form fields, Paystack checkout with split, signed webhooks, unguessable ticket codes + QR, emailed tickets | |
| D | Door scanner (camera QR) with atomic single-use check-in | |
| E | Voting contests: contestant entry, free vote (phone-verified), paid vote bundles, realtime leaderboard | |
| F | Earnings ledger, commission settings, flagged transactions, settlement tracking | |
