# Ariya roadmap

Ariya is a private planner plus a marketplace for ticketed parties, aso-ebi
and voting contests.

## Decisions (September 2026)

| Topic | Decision | Why |
|---|---|---|
| Payments | Paystack split payments with a subaccount per seller | The seller's share settles straight to their bank. The platform never holds seller money, which in Nigeria would need a CBN Mobile Money Operator licence. |
| Seller "wallet" | Earnings view (sales, commission, refunds, promoter commissions owed) | Same reason as above |
| Free votes | One per phone-verified account (OTP), one phone per account | Nigerian mobile networks share IP addresses (CGNAT), so one-per-IP would block whole networks |
| Paid contests | Organisers confirm they hold any permit their state requires | Promotional competitions are regulated by state gaming authorities (e.g. LSLGA in Lagos). Get legal advice before launch. |
| Promoter commissions | Tracked and shown to the seller, paid by the seller | Money settles to the seller, so the platform cannot pay promoters without holding funds |
| Ownership | Company registered with CAC; Paystack business account in the company name | Two co-founders; keeps money and IP with the business |

## Status

| Area | Status |
|---|---|
| Planner (browser-only), Danfo Signboard design | Done |
| Roles, profiles, shared-planner schema + RLS | Done (planner still saves in the browser; moving it to the database is next) |
| Seller application with Paystack bank verification, admin approval | Done |
| Ticketed events: single, tables (one QR per seat), early bird, hidden comps, promo codes, promoter links, custom checkout questions, buyer- or seller-paid fees | Done |
| Paystack checkout with split, signed webhook, payment re-verification, fraud flags | Done |
| Door scanner: camera + manual entry, offline guest list, earliest-scan-wins sync | Done |
| Refunds: cancel (automatic), postpone (buyer self-service), seller refunds, refund worker | Done |
| Contests: entry tickets → contestants, free + paid votes, realtime leaderboard, share cards | Done |
| Aso-ebi sales at checkout with collection list | Done |
| Terms, refund policy, privacy (NDPA) | Draft; needs lawyer review and company details |
| Move planner to Supabase; invite committee | Next |
| Ticket delivery by email/WhatsApp | Later (not requested) |
| Seller payouts report export, analytics, error monitoring | Later |
