# Supabase setup

The database lives in `migrations/`. Each file runs once, in name order.
`tests/` holds security tests that run on plain Postgres (locally and in CI);
**never run anything from `tests/` against the real Supabase project.**

## First-time setup (Phase A2)

1. Create a project at supabase.com. Region: pick the one closest to your
   users (for Nigeria, `eu-west-2` London or `af-south-1` Cape Town if offered).
2. Open **SQL Editor → New query**, paste the contents of
   `migrations/20260924000001_profiles_and_roles.sql`, click **Run**.
3. Do the same for `migrations/20260924000002_planner.sql`.
4. Sign up in the app once with your own email, then make yourself the
   platform admin by running this in the SQL editor (swap in your email):

   ```sql
   update public.profiles
   set role = 'super_admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

5. Copy **Project Settings → API → Project URL** and the **anon public** key
   into Vercel as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

The anon key is meant to be public; row level security protects the data.
The **service_role** key bypasses all security. It must never go into the
frontend, Vercel's `VITE_` variables, GitHub, or a chat message.

## Running the security tests locally

```bash
PGHOST=localhost PGUSER=postgres ./scripts/test-db.sh
```
