# Supabase: database, sign-in and server functions

- `migrations/`: the database. Files run once, in name order.
- `functions/`: Edge Functions (Deno) that talk to Paystack.
- `tests/`: security tests that run on plain Postgres (locally and in CI).
  **Never run anything from `tests/` against the real project.**

## Going live (one time, in this order)

### 1. Create the project
supabase.com → **New project** → name `ariya`, generate and save the database
password, region closest to your users (for Nigeria, London `eu-west-2`).

### 2. Run the migrations
**SQL Editor → New query**, paste each file from `migrations/` in name order,
**Run** each one:

1. `20260924000001_profiles_and_roles.sql`
2. `20260924000002_planner.sql`
3. `20260924000003_marketplace.sql`
4. `20260924000004_media_storage.sql`
5. `20260924000005_expire_orders.sql` (also schedules a job every 10 minutes that tidies up unpaid orders)

If one fails, stop and send the error; do not re-run it.

### 3. Sign-in settings
**Authentication → URL Configuration**
- Site URL: your live address, e.g. `https://event-planner-three-inky.vercel.app`
- Redirect URLs: add `https://YOUR-DOMAIN/**`

**Authentication → Providers → Phone** (for free votes)
- Enable phone, pick an SMS provider that delivers to Nigerian numbers
  (Twilio, Vonage or MessageBird) and enter its keys.
- Keep **Confirm phone** ON. Free votes rely on it; with it off, a phone
  counts as verified without any code.

### 3b. Sign-in emails (required before launch)
Supabase's built-in email is only for testing and sends a handful of emails
per hour. Connect a real sender:
1. Create an account at resend.com, add your domain and add the DNS records it shows.
2. Create an API key.
3. Supabase → **Project Settings → Authentication → SMTP Settings** → enable
   custom SMTP: host `smtp.resend.com`, port `465`, username `resend`,
   password = the API key, sender `Ariya <hello@yourdomain>`.
4. **Authentication → Rate Limits**: raise the email limit (e.g. 100/hour).
5. **Authentication → Email Templates → Magic Link**: change the subject to
   “Your Ariya sign-in link”.

### 4. Paystack
In the Paystack dashboard (business account in the company's name):
- **Settings → API Keys & Webhooks**: copy the **secret key**.
- Webhook URL: `https://YOUR-PROJECT.supabase.co/functions/v1/paystack-webhook`
- Check that current Paystack pricing matches **Admin → Commission & fees** in the app.

### 5. Deploy the functions and their secrets
With the Supabase CLI logged in (`npx supabase login`, then
`npx supabase link --project-ref YOUR-REF`):

```bash
npx supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx \
  APP_ORIGIN=https://YOUR-DOMAIN \
  CRON_SECRET=$(openssl rand -hex 24)
npx supabase functions deploy
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.
Use `sk_test_...` first and run a real test purchase before switching to live.

### 6. Refund worker (optional schedule)
Admins can press **Send pending refunds to Paystack** in the admin page. To
automate it, schedule a POST to `/functions/v1/process-refunds` with header
`x-cron-secret: <CRON_SECRET>` every 15 minutes (Supabase Cron or any cron).

### 7. Frontend
In Vercel → **Settings → Environment Variables** add:
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

Redeploy. The anon key is public by design; row level security protects the data.
**The service_role key and Paystack secret key must never go into Vercel,
`VITE_` variables, GitHub or a chat message.**

### 8. Make yourself admin
Sign in once on the live site, then in the SQL editor:

```sql
update public.profiles set role = 'super_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Local development and tests

Requires Docker.

```bash
export SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN=local-test   # local SMS uses test OTPs
npx supabase start                       # add SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io if ECR is blocked
cp supabase/functions/.env.example supabase/functions/.env
npx supabase functions serve --env-file supabase/functions/.env
node scripts/fake-paystack.mjs           # fake Paystack on :4010
```

| Command | What it checks |
|---|---|
| `npm run test:db` | 95 SQL security and money checks on plain Postgres (needs PGHOST etc.) |
| `npm run e2e:payments` | 26 API checks: seller onboarding, split checkout, webhooks, refunds, live votes |
| `npm run e2e:ui` | 24 browser checks as seller, admin, buyer and door staff |

The e2e scripts need `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` from
`npx supabase status -o env`, and `e2e:ui` needs the app built with
`.env.local` pointing at local Supabase and served on port 5173
(`npm run build && npx vite preview --port 5173 --host 127.0.0.1`).
Local test phone: `0803 123 4567`, code `123456`.
