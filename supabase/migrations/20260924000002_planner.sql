-- Ariya · Phase A1 · Private event planner, shared with a planning committee
--
-- An event belongs to whoever created it (owner). The owner can invite other
-- signed-in people as editors or viewers. Nobody else can see the event,
-- its guest list, budget or aso-ebi records.

create type public.planner_member_role as enum ('owner', 'editor', 'viewer');

create table public.planner_events (
  id            uuid primary key default gen_random_uuid(),
  created_by    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title         text not null check (char_length(title) between 1 and 80),
  type          text not null check (type in ('trad-wedding', 'white-wedding', 'owambe', 'naming', 'remembrance', 'corporate')),
  date          date not null,
  start_time    time not null default '12:00',
  venue         text not null default '' check (char_length(venue) <= 160),
  city          text not null check (char_length(city) between 1 and 80),
  currency      text not null default 'NGN' check (currency in ('NGN', 'GHS', 'KES', 'ZAR', 'USD')),
  budget        bigint not null default 0 check (budget >= 0),
  guest_target  integer not null default 0 check (guest_target between 0 and 20000),
  hosts         text not null default '' check (char_length(hosts) <= 160),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.planner_members (
  event_id    uuid not null references public.planner_events (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.planner_member_role not null default 'editor',
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index planner_members_user_idx on public.planner_members (user_id);

create table public.planner_guests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.planner_events (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  phone       text not null default '' check (char_length(phone) <= 30),
  "group"     text not null default 'family' check ("group" in ('family', 'friends', 'colleagues', 'faith', 'vip')),
  rsvp        text not null default 'pending' check (rsvp in ('pending', 'yes', 'maybe', 'no')),
  plus_ones   integer not null default 0 check (plus_ones between 0 and 20),
  created_at  timestamptz not null default now()
);
create index planner_guests_event_idx on public.planner_guests (event_id);

create table public.planner_budget_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.planner_events (id) on delete cascade,
  category    text not null check (category in ('venue', 'catering', 'drinks', 'decor', 'entertainment', 'media', 'attire', 'souvenirs', 'logistics', 'other')),
  label       text not null check (char_length(label) between 1 and 120),
  planned     bigint not null default 0 check (planned >= 0),
  paid        bigint not null default 0 check (paid >= 0),
  created_at  timestamptz not null default now()
);
create index planner_budget_items_event_idx on public.planner_budget_items (event_id);

create table public.planner_event_vendors (
  event_id    uuid not null references public.planner_events (id) on delete cascade,
  vendor_id   text not null check (char_length(vendor_id) <= 80),
  status      text not null default 'enquired' check (status in ('enquired', 'booked', 'deposit', 'paid')),
  created_at  timestamptz not null default now(),
  primary key (event_id, vendor_id)
);

create table public.planner_schedule_items (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.planner_events (id) on delete cascade,
  time        time not null,
  title       text not null check (char_length(title) between 1 and 160),
  owner       text not null default '' check (char_length(owner) <= 80),
  created_at  timestamptz not null default now()
);
create index planner_schedule_items_event_idx on public.planner_schedule_items (event_id);

create table public.planner_asoebi (
  event_id        uuid primary key references public.planner_events (id) on delete cascade,
  fabric          text not null check (char_length(fabric) between 1 and 120),
  price_per_set   bigint not null check (price_per_set > 0),
  colors          text[] not null default '{}' check (cardinality(colors) <= 3),
  pay_to          text not null default '' check (char_length(pay_to) <= 160)
);

create table public.planner_asoebi_buyers (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.planner_asoebi (event_id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  sets        integer not null check (sets between 1 and 50),
  paid        boolean not null default false,
  collected   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index planner_asoebi_buyers_event_idx on public.planner_asoebi_buyers (event_id);

create trigger planner_events_touch_updated_at
  before update on public.planner_events
  for each row execute function public.touch_updated_at();

-- Membership helpers ------------------------------------------------------

create function public.planner_role(target_event uuid)
returns public.planner_member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.planner_members m
  where m.event_id = target_event and m.user_id = auth.uid();
$$;

create function public.can_view_planner_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.planner_role(target_event) is not null;
$$;

create function public.can_edit_planner_event(target_event uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.planner_role(target_event) in ('owner', 'editor');
$$;

-- The creator becomes the owner automatically.
create function public.add_planner_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.planner_members (event_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger planner_events_add_owner
  after insert on public.planner_events
  for each row execute function public.add_planner_owner();

-- The creator can never be reassigned.
create function public.protect_planner_creator()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'Event owner cannot change' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger planner_events_protect_creator
  before update on public.planner_events
  for each row execute function public.protect_planner_creator();

-- Invite a committee member by email. Only the owner can invite.
-- Returns false when no Ariya account uses that email yet.
create function public.invite_planner_member(
  target_event uuid,
  invitee_email text,
  member_role public.planner_member_role default 'editor'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitee uuid;
begin
  if public.planner_role(target_event) is distinct from 'owner' then
    raise exception 'Only the event owner can invite people' using errcode = '42501';
  end if;
  if member_role = 'owner' then
    raise exception 'An event has one owner' using errcode = '22023';
  end if;

  select u.id into invitee from auth.users u where lower(u.email) = lower(trim(invitee_email));
  if invitee is null then
    return false;
  end if;

  insert into public.planner_members (event_id, user_id, role)
  values (target_event, invitee, member_role)
  on conflict (event_id, user_id) do update set role = excluded.role
  where public.planner_members.role <> 'owner';
  return true;
end;
$$;

revoke all on function public.planner_role(uuid) from public, anon;
revoke all on function public.can_view_planner_event(uuid) from public, anon;
revoke all on function public.can_edit_planner_event(uuid) from public, anon;
revoke all on function public.invite_planner_member(uuid, text, public.planner_member_role) from public, anon;
grant execute on function public.planner_role(uuid) to authenticated, service_role;
grant execute on function public.can_view_planner_event(uuid) to authenticated, service_role;
grant execute on function public.can_edit_planner_event(uuid) to authenticated, service_role;
grant execute on function public.invite_planner_member(uuid, text, public.planner_member_role) to authenticated;

-- Row level security -------------------------------------------------------

alter table public.planner_events enable row level security;
alter table public.planner_members enable row level security;
alter table public.planner_guests enable row level security;
alter table public.planner_budget_items enable row level security;
alter table public.planner_event_vendors enable row level security;
alter table public.planner_schedule_items enable row level security;
alter table public.planner_asoebi enable row level security;
alter table public.planner_asoebi_buyers enable row level security;

-- created_by is included so "insert ... returning" works before the owner
-- trigger has added the membership row.
create policy "Members read the event" on public.planner_events
  for select to authenticated using (created_by = auth.uid() or public.can_view_planner_event(id));
create policy "Signed-in users create their own events" on public.planner_events
  for insert to authenticated with check (created_by = auth.uid());
create policy "Owners and editors update the event" on public.planner_events
  for update to authenticated
  using (public.can_edit_planner_event(id))
  with check (public.can_edit_planner_event(id));
create policy "Only the owner deletes the event" on public.planner_events
  for delete to authenticated using (public.planner_role(id) = 'owner');

create policy "Members see who else is on the committee" on public.planner_members
  for select to authenticated using (public.can_view_planner_event(event_id));
create policy "Owner changes member roles" on public.planner_members
  for update to authenticated
  using (public.planner_role(event_id) = 'owner' and role <> 'owner')
  with check (public.planner_role(event_id) = 'owner' and role <> 'owner');
create policy "Owner removes members, anyone can leave" on public.planner_members
  for delete to authenticated
  using (role <> 'owner' and (public.planner_role(event_id) = 'owner' or user_id = auth.uid()));
-- No insert policy: members are added by the owner trigger and invite_planner_member().

-- Same rule for every child table: members read, owners and editors write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'planner_guests', 'planner_budget_items', 'planner_event_vendors',
    'planner_schedule_items', 'planner_asoebi', 'planner_asoebi_buyers'
  ] loop
    execute format(
      'create policy "Members read" on public.%I for select to authenticated using (public.can_view_planner_event(event_id))', t);
    execute format(
      'create policy "Editors insert" on public.%I for insert to authenticated with check (public.can_edit_planner_event(event_id))', t);
    execute format(
      'create policy "Editors update" on public.%I for update to authenticated using (public.can_edit_planner_event(event_id)) with check (public.can_edit_planner_event(event_id))', t);
    execute format(
      'create policy "Editors delete" on public.%I for delete to authenticated using (public.can_edit_planner_event(event_id))', t);
  end loop;
end;
$$;
