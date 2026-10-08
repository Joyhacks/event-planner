# Ariya production release

This change completes core planner workflows and adds safeguards. It does not
configure the hosted Supabase project, send test emails, activate Paystack, or
deploy the production website. Passing local checks is not a substitute for the
staging checks below.

## What ships

- Device-first planning, with explicit **Save to account** for each event.
- Account-scoped cloud caching and periodic sync (every eight seconds and on
  reconnect/focus). Pending changes stay visible; conflicting saves stop and
  offer a backup before loading the server version. There is no automatic merge.
- Owner/editor/viewer committee access using the existing RLS policies. Members
  must already have accounts. Adding access does not send invitation emails;
  owners share the event URL themselves.
- JSON backup/restore, original-data recovery for unreadable browser storage,
  and CSV guest import with preview, validation and duplicate detection.
- Guest editing and separate pending/maybe seat totals; confirmed-only export by
  default; custom vendor records; editable, printable and shareable programmes.
- Aso-ebi deposits, total received, last payment date, notes and balances. This
  records payments manually; it does not collect or verify money and is not a
  transaction-by-transaction accounting ledger.
- Larger controls, responsive toolbars, login error recovery, same-origin login
  destinations and basic security headers.

The vendor directory is still demonstration data. Planner subscriptions,
automatic invitation delivery, public guest RSVP links and live vendor booking
are not implemented by this release. The existing marketplace remains separate.

## Configuration and deployment

1. Back up the hosted database and test the release on a separate Supabase
   staging project. Apply migrations in filename order. Existing projects need
   only `supabase/migrations/20261008000006_planner_sync.sql` after the first five
   migrations. Do not paste the test stubs or test SQL into a real project.
2. Configure custom SMTP and the production/preview redirect allowlist in
   Supabase Auth. Magic links use PKCE: open the email on the browser that
   requested it. Verify delivery, an expired link, sign-out and sign-in again.
3. In Vercel set the public variables listed in `.env.example`: Supabase URL and
   public anon/publishable key, site URL, real operator name, registration number,
   address, support email and privacy email. Review the existing policy text and
   set `VITE_TERMS_REVIEWED=true` only after approval. None of these values may be
   invented. Secret/service-role/Paystack keys must never be `VITE_` variables.
4. Keep `VITE_MARKETPLACE_ENABLED=false` for a planner-only launch. This flag gates
   marketplace pages/navigation, not backend authorization. Existing Edge
   Functions remain protected by their own authentication and validation rules.
   Do not deploy live payment credentials before completing their separate tests.
5. Run `npm ci && npm run check` and `npm run check:launch` with production
   environment values. The second command checks configuration, not connectivity
   or legal sufficiency. It deliberately fails on this unconfigured checkout.
6. Vercel uses `npm run build:deploy`. Its production build fails when required
   configuration is missing; preview builds remain available for review. Other
   hosts must explicitly run `npm run check:launch && npm run build` and apply
   equivalent security headers. `npm run build` alone does not enforce launch
   configuration. Check that dashboard build overrides do not bypass the gate.
7. Complete the staging checks, then merge and deploy through the normal release
   process. Do not enable ticketing merely because planner cloud saving works.

For a ticketing launch, follow `supabase/README.md` and its payment/refund/email
checks with test credentials first. Set `MARKETPLACE_LAUNCH_APPROVED=true` and
`VITE_MARKETPLACE_ENABLED=true` only after the operator approves that launch.
Live purchases/refunds require the operator to execute and verify real payments.

## Staging acceptance checks

| Flow | Required outcome |
| --- | --- |
| New account and magic link | Email arrives, same-browser callback signs in, account loads; invalid/expired links have a recoverable outcome |
| Device event and backup | Create a real test event; add guests/budget/vendor/programme/payment; reload; export JSON; restore a separate copy |
| CSV import | Quoted names and phone numbers survive; duplicate guests are skipped; invalid rows prevent partial imports |
| Cloud save | Explicit upload removes the duplicate device copy only after success; another browser shows the full plan |
| Offline edits | Disconnect, edit, see pending status; reconnect and verify saved values from another browser |
| Concurrent editors | Both edit the same revision; the second save reports conflict and preserves a downloadable local copy |
| Permissions | Viewer cannot change any tab; editor cannot invite/delete; unrelated user cannot read; removed member loses cloud access |
| Account isolation | Sign out and sign into a second account; no first-account cloud events appear; the signed-out account cache is removed |
| Exports and recovery | Confirmed CSV excludes declined/pending/maybe; programme prints cleanly; backups restore; storage failure never says saved locally |
| Money | Partial and excess payments display correctly; one overpayment does not cancel someone else's balance |
| Mobile and accessibility | At 320/390/768/1366px: no document overflow, forms and tabs usable, keyboard focus visible, screen-reader labels and error announcements work |
| Reload and routes | Deep links survive refresh; unknown routes show 404 UI; disabled ticketing routes lead to the planner |

The remote inspection browser cannot reach this workspace's localhost. Mobile
device, hosted email/auth and live-cloud acceptance checks must therefore be
completed on the deployment preview/staging site. Do not mark them passed based
only on TypeScript, SQL tests or source inspection.

## Automated validation

- `npm run check`: lint, typecheck, Vitest, all migrations and SQL suites in
  isolated PGlite/Postgres, then production build.
- `npm run test:db`: the same SQL tests on real PostgreSQL, retained in CI with
  a PostgreSQL 16 service. New tests cover round-trip snapshots, partial payments,
  roles, revocation, stale revisions, transaction rollback and deletion.
- The portable runner does not validate Supabase's hosted Auth, network API,
  Edge Functions, real-time subscriptions or pg_cron. Use staging and the existing
  `e2e:payments`/`e2e:ui` scripts for those integration checks.
- `npm audit --omit=dev`: review production dependency advisories before release.

## Operations and rollback

Configure error alerts (`VITE_SENTRY_DSN` is optional), database backups, a tested
restore procedure and a working support inbox. Monitor authentication failures,
cloud save errors/conflicts and payment/refund failures before increasing traffic.
Never attach raw guest lists, bank instructions, tokens or backup files to public
issues. Users can export private plans; use only data you are entitled to process.

The migration is additive, but an older cloud client writing only the legacy
`paid` boolean will not update `amount_paid`. Do not run such clients against the
new shared planner. The previous browser-only planner still works with its own
device data, but cannot display new cloud plans. In a frontend rollback, retain
the database migration and cloud backups and fix forward; do not drop populated
tables or restore a database snapshot without an explicit data recovery plan.
