-- Ariya · Phase A1 · Profiles and platform roles
--
-- Every signed-in person gets a profile. The role decides what they can do:
--   user        default: plans private events, buys tickets, votes
--   seller      approved organiser: hosts public ticketed events and contests
--   super_admin platform operator: approves sellers, sets commission, reviews flags
--
-- Roles can only be changed by a super_admin (or the service role used by
-- server-side functions). Nobody can promote themselves.

create type public.app_role as enum ('user', 'seller', 'super_admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  avatar_url  text check (avatar_url is null or avatar_url ~ '^https://'),
  role        public.app_role not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. Role changes are restricted to super_admin.';

alter table public.profiles enable row level security;

-- Helpers ---------------------------------------------------------------

-- security definer so policies can call them without recursive RLS checks.
create function public.has_role(check_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = check_role
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('super_admin');
$$;

-- True once Supabase Auth has confirmed the user's phone with an OTP.
-- Used later to limit free votes to one per verified person.
create function public.has_verified_phone()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.phone_confirmed_at is not null
  );
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Create a profile automatically when someone signs up --------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Block self-promotion ---------------------------------------------------

-- Signed-in clients (anon/authenticated) may edit their own name and avatar,
-- but never their role. Server code (service_role) and SQL run by the
-- project owner are not restricted.
create function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Profile id cannot change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Policies ---------------------------------------------------------------

create policy "Read own profile or any profile as admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_super_admin());

create policy "Update own profile or any profile as admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());

-- No insert policy: rows are created by the signup trigger only.
-- No delete policy: profiles go when the auth user is deleted.

revoke all on function public.has_role(public.app_role) from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.has_verified_phone() from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_verified_phone() to authenticated;
grant execute on function public.has_role(public.app_role) to service_role;
grant execute on function public.is_super_admin() to service_role;
grant execute on function public.has_verified_phone() to service_role;
