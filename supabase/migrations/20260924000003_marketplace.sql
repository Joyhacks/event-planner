-- Ariya · Marketplace: sellers, ticketed events, orders, tickets, door scanning,
-- refunds, contests and votes, aso-ebi sales.
--
-- Money rules
--   * Every amount is an integer number of kobo (₦1 = 100 kobo).
--   * Prices, discounts, fees and commission are always computed here, on the
--     server. The browser only ever sends item ids and quantities.
--   * Payments use Paystack split payments. The seller's share settles to the
--     seller's own bank account through their Paystack subaccount; the
--     platform receives only its commission (plus the Paystack fee when the
--     buyer pays it). Ariya never holds seller funds.

-- Platform settings (single row) ------------------------------------------

create table public.platform_settings (
  id                        boolean primary key default true check (id),
  commission_bps            integer not null default 500 check (commission_bps between 0 and 5000),
  commission_flat_kobo      bigint  not null default 0 check (commission_flat_kobo >= 0),
  -- Paystack local card pricing. Verify against paystack.com/pricing before launch.
  paystack_fee_bps          integer not null default 150 check (paystack_fee_bps between 0 and 1000),
  paystack_fee_flat_kobo    bigint  not null default 10000 check (paystack_fee_flat_kobo >= 0),
  paystack_flat_waiver_kobo bigint  not null default 250000 check (paystack_flat_waiver_kobo >= 0),
  paystack_fee_cap_kobo     bigint  not null default 200000 check (paystack_fee_cap_kobo >= 0),
  order_hold_minutes        integer not null default 15 check (order_hold_minutes between 5 and 120),
  updated_at                timestamptz not null default now(),
  updated_by                uuid references auth.users (id)
);
insert into public.platform_settings default values;

-- Sellers ---------------------------------------------------------------------

create table public.seller_applications (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  business_name    text not null check (char_length(business_name) between 2 and 120),
  phone            text not null check (phone ~ '^\+?[0-9 ]{7,20}$'),
  instagram        text not null default '' check (char_length(instagram) <= 80),
  about            text not null default '' check (char_length(about) <= 1000),
  bank_code        text not null check (bank_code ~ '^[0-9A-Za-z]{2,10}$'),
  bank_name        text not null check (char_length(bank_name) <= 120),
  account_number   text not null check (account_number ~ '^[0-9]{10}$'),
  -- Name returned by Paystack's account lookup. Written by the server only.
  account_name     text not null check (char_length(account_name) between 1 and 160),
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note       text not null default '' check (char_length(admin_note) <= 500),
  reviewed_by      uuid references auth.users (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create unique index seller_applications_one_pending on public.seller_applications (user_id) where status = 'pending';

create table public.sellers (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 2 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'),
  bio           text not null default '' check (char_length(bio) <= 1000),
  instagram     text not null default '',
  suspended     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Kept apart from `sellers` so payout details are never public.
create table public.seller_payout_accounts (
  user_id           uuid primary key references public.sellers (user_id) on delete cascade,
  subaccount_code   text not null unique,
  bank_name         text not null,
  account_last4     text not null check (account_last4 ~ '^[0-9]{4}$'),
  account_name      text not null,
  created_at        timestamptz not null default now()
);

-- Events -----------------------------------------------------------------------

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.sellers (user_id) on delete restrict,
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$'),
  title           text not null check (char_length(title) between 2 and 120),
  description     text not null default '' check (char_length(description) <= 5000),
  category        text not null default 'party' check (category in ('party', 'owambe', 'concert', 'wedding', 'pageant', 'conference', 'other')),
  venue           text not null default '' check (char_length(venue) <= 160),
  address         text not null default '' check (char_length(address) <= 240),
  city            text not null check (char_length(city) between 1 and 80),
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  cover_url       text check (cover_url is null or cover_url ~ '^https?://'),
  status          text not null default 'draft' check (status in ('draft', 'published', 'postponed', 'cancelled', 'ended')),
  status_note     text not null default '' check (char_length(status_note) <= 500),
  fee_bearer      text not null default 'buyer' check (fee_bearer in ('buyer', 'seller')),
  -- Extra questions at checkout: [{ "id": "tshirt", "label": "T-shirt size", "type": "text"|"select", "required": bool, "options": [..] }]
  form_fields     jsonb not null default '[]' check (jsonb_typeof(form_fields) = 'array' and jsonb_array_length(form_fields) <= 10),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index events_seller_idx on public.events (seller_id);
create index events_public_idx on public.events (status, starts_at);

create table public.ticket_types (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 80),
  description     text not null default '' check (char_length(description) <= 300),
  kind            text not null default 'single' check (kind in ('single', 'table', 'entry')),
  seats           integer not null default 1 check (seats between 1 and 50),
  price_kobo      bigint not null check (price_kobo >= 0 and price_kobo <= 100000000),
  quantity        integer not null check (quantity between 0 and 100000),
  sold            integer not null default 0 check (sold >= 0),
  sale_starts_at  timestamptz,
  sale_ends_at    timestamptz,
  max_per_order   integer not null default 10 check (max_per_order between 1 and 50),
  -- Hidden types are never sold publicly; used for complimentary tickets.
  hidden          boolean not null default false,
  contest_id      uuid,
  sort            integer not null default 0,
  created_at      timestamptz not null default now(),
  check (kind <> 'single' or seats = 1),
  check (sale_ends_at is null or sale_starts_at is null or sale_ends_at > sale_starts_at)
);
create index ticket_types_event_idx on public.ticket_types (event_id);

create table public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  code             text not null check (code ~ '^[A-Z0-9]{3,20}$'),
  percent_off      integer check (percent_off between 1 and 100),
  amount_off_kobo  bigint check (amount_off_kobo > 0),
  max_uses         integer check (max_uses > 0),
  used             integer not null default 0,
  expires_at       timestamptz,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (event_id, code),
  check ((percent_off is null) <> (amount_off_kobo is null))
);

create table public.promoters (
  id               uuid primary key default gen_random_uuid(),
  event_id         uuid not null references public.events (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  code             text not null check (code ~ '^[a-z0-9-]{3,30}$'),
  commission_bps   integer not null default 1000 check (commission_bps between 0 and 5000),
  created_at       timestamptz not null default now(),
  unique (event_id, code)
);

create table public.asoebi_items (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 500),
  colors       text[] not null default '{}' check (cardinality(colors) <= 3),
  price_kobo   bigint not null check (price_kobo > 0 and price_kobo <= 100000000),
  stock        integer not null check (stock between 0 and 100000),
  sold         integer not null default 0 check (sold >= 0),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
create index asoebi_items_event_idx on public.asoebi_items (event_id);

-- Contests -------------------------------------------------------------------------

create table public.contests (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events (id) on delete cascade,
  title               text not null check (char_length(title) between 2 and 120),
  description         text not null default '' check (char_length(description) <= 3000),
  voting_starts_at    timestamptz not null,
  voting_ends_at      timestamptz not null,
  free_votes_enabled  boolean not null default true,
  show_counts         boolean not null default true,
  -- Organiser confirms they hold any promotional-competition permit their state requires.
  permit_confirmed    boolean not null default false,
  created_at          timestamptz not null default now(),
  check (voting_ends_at > voting_starts_at)
);
create index contests_event_idx on public.contests (event_id);

alter table public.ticket_types
  add constraint ticket_types_contest_fk foreign key (contest_id) references public.contests (id) on delete set null,
  add constraint ticket_types_entry_has_contest check (kind <> 'entry' or contest_id is not null);

create table public.contestants (
  id            uuid primary key default gen_random_uuid(),
  contest_id    uuid not null references public.contests (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  number        integer not null,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  bio           text not null default '' check (char_length(bio) <= 1000),
  photo_url     text check (photo_url is null or photo_url ~ '^https?://'),
  status        text not null default 'active' check (status in ('active', 'withdrawn')),
  votes_count   bigint not null default 0 check (votes_count >= 0),
  created_at    timestamptz not null default now(),
  unique (contest_id, number)
);
create index contestants_board_idx on public.contestants (contest_id, votes_count desc);

create table public.vote_packages (
  id          uuid primary key default gen_random_uuid(),
  contest_id  uuid not null references public.contests (id) on delete cascade,
  votes       integer not null check (votes between 1 and 100000),
  price_kobo  bigint not null check (price_kobo >= 1000 and price_kobo <= 100000000),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Orders, tickets, votes ----------------------------------------------------------------

create table public.orders (
  id                        uuid primary key default gen_random_uuid(),
  reference                 text not null unique,
  buyer_id                  uuid not null references auth.users (id) on delete restrict,
  event_id                  uuid not null references public.events (id) on delete restrict,
  kind                      text not null check (kind in ('purchase', 'votes', 'comp')),
  status                    text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'refund_pending', 'refunded', 'flagged')),
  subtotal_kobo             bigint not null check (subtotal_kobo >= 0),
  discount_kobo             bigint not null default 0 check (discount_kobo >= 0),
  buyer_fee_kobo            bigint not null default 0 check (buyer_fee_kobo >= 0),
  total_kobo                bigint not null check (total_kobo >= 0),
  commission_kobo           bigint not null default 0 check (commission_kobo >= 0),
  -- What Paystack should route to the platform (commission + buyer-paid fee).
  platform_charge_kobo      bigint not null default 0 check (platform_charge_kobo >= 0),
  fee_bearer                text not null check (fee_bearer in ('buyer', 'seller')),
  promo_code_id             uuid references public.promo_codes (id),
  promoter_id               uuid references public.promoters (id),
  promoter_commission_kobo  bigint not null default 0,
  buyer_name                text not null check (char_length(buyer_name) between 1 and 120),
  buyer_email               text not null check (buyer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  buyer_phone               text not null default '' check (char_length(buyer_phone) <= 30),
  answers                   jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  paystack_transaction_id   text,
  paid_kobo                 bigint,
  paid_at                   timestamptz,
  expires_at                timestamptz not null,
  created_at                timestamptz not null default now()
);
create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_event_idx on public.orders (event_id, status);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  item_type        text not null check (item_type in ('ticket', 'asoebi', 'votes')),
  ticket_type_id   uuid references public.ticket_types (id),
  asoebi_item_id   uuid references public.asoebi_items (id),
  vote_package_id  uuid references public.vote_packages (id),
  contestant_id    uuid references public.contestants (id),
  quantity         integer not null check (quantity between 1 and 50),
  unit_price_kobo  bigint not null check (unit_price_kobo >= 0),
  line_total_kobo  bigint not null check (line_total_kobo >= 0),
  collected        boolean not null default false,
  check (
    (item_type = 'ticket' and ticket_type_id is not null) or
    (item_type = 'asoebi' and asoebi_item_id is not null) or
    (item_type = 'votes' and vote_package_id is not null and contestant_id is not null)
  )
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_ticket_type_idx on public.order_items (ticket_type_id) where ticket_type_id is not null;
create index order_items_asoebi_idx on public.order_items (asoebi_item_id) where asoebi_item_id is not null;

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  event_id        uuid not null references public.events (id) on delete restrict,
  ticket_type_id  uuid not null references public.ticket_types (id),
  -- 128 random bits, hex. This is what the QR code carries.
  code            text not null unique check (code ~ '^[0-9a-f]{32}$'),
  -- sha256(code), so offline scanners can validate without holding real codes.
  code_hash       text not null unique,
  holder_name     text not null,
  seats           integer not null default 1,
  status          text not null default 'valid' check (status in ('valid', 'checked_in', 'void')),
  checked_in_at   timestamptz,
  checked_in_by   uuid references auth.users (id),
  created_at      timestamptz not null default now()
);
create index tickets_event_idx on public.tickets (event_id);
create index tickets_order_idx on public.tickets (order_id);

create table public.event_staff (
  event_id    uuid not null references public.events (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  added_by    uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.ticket_scans (
  id          bigint generated always as identity primary key,
  event_id    uuid not null references public.events (id) on delete cascade,
  ticket_id   uuid references public.tickets (id) on delete cascade,
  scanned_by  uuid not null references auth.users (id),
  scanned_at  timestamptz not null default now(),
  synced_at   timestamptz not null default now(),
  device_id   text not null default '' check (char_length(device_id) <= 80),
  offline     boolean not null default false,
  result      text not null check (result in ('admitted', 'duplicate', 'void', 'unknown'))
);
create index ticket_scans_event_idx on public.ticket_scans (event_id, scanned_at desc);

create table public.votes (
  id             bigint generated always as identity primary key,
  contest_id     uuid not null references public.contests (id) on delete cascade,
  contestant_id  uuid not null references public.contestants (id) on delete cascade,
  voter_id       uuid not null references auth.users (id) on delete cascade,
  kind           text not null check (kind in ('free', 'paid')),
  quantity       integer not null check (quantity > 0),
  order_id       uuid references public.orders (id),
  created_at     timestamptz not null default now(),
  check ((kind = 'free') = (order_id is null))
);
-- One free vote per person per contest.
create unique index votes_one_free_per_contest on public.votes (contest_id, voter_id) where kind = 'free';
create index votes_contestant_idx on public.votes (contestant_id);

create table public.refunds (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null unique references public.orders (id) on delete cascade,
  amount_kobo          bigint not null check (amount_kobo > 0),
  reason               text not null check (char_length(reason) between 1 and 300),
  status               text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  paystack_refund_id   text,
  last_error           text,
  requested_by         uuid not null references auth.users (id),
  created_at           timestamptz not null default now(),
  processed_at         timestamptz
);

create table public.flagged_transactions (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references public.orders (id) on delete set null,
  reason       text not null,
  details      jsonb not null default '{}',
  status       text not null default 'open' check (status in ('open', 'resolved')),
  resolved_by  uuid references auth.users (id),
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create trigger events_touch_updated_at before update on public.events
  for each row execute function public.touch_updated_at();

-- Access helpers --------------------------------------------------------------------------

create function public.is_active_seller()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.sellers s join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid() and not s.suspended and p.role in ('seller', 'super_admin')
  );
$$;

create function public.owns_event(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = target_event and e.seller_id = auth.uid());
$$;

create function public.can_scan_event(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.owns_event(target_event)
      or exists (select 1 from public.event_staff s where s.event_id = target_event and s.user_id = auth.uid());
$$;

create function public.event_is_public(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = target_event and e.status <> 'draft');
$$;

create function public.contest_event(target_contest uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.event_id from public.contests c where c.id = target_contest;
$$;

-- Money helpers -------------------------------------------------------------------------------

-- Paystack's fee on a charge of `amount` kobo, per platform_settings.
create function public.paystack_fee(amount bigint)
returns bigint language sql stable set search_path = '' as $$
  select case when amount <= 0 then 0 else least(
    s.paystack_fee_cap_kobo,
    ceil(amount * s.paystack_fee_bps / 10000.0)::bigint
      + case when amount >= s.paystack_flat_waiver_kobo then s.paystack_fee_flat_kobo else 0 end
  ) end
  from public.platform_settings s;
$$;

-- Smallest charge whose Paystack fee still leaves `net` kobo.
create function public.gross_up_for_fee(net bigint)
returns bigint language plpgsql stable set search_path = '' as $$
declare
  gross bigint := net;
begin
  if net <= 0 then return 0; end if;
  for i in 1..6 loop
    gross := net + public.paystack_fee(gross);
  end loop;
  while gross - public.paystack_fee(gross) < net loop
    gross := gross + 1;
  end loop;
  return gross;
end;
$$;

create function public.new_order_reference()
returns text language sql volatile set search_path = '' as $$
  select 'ARY-' || upper(encode(extensions.gen_random_bytes(6), 'hex'));
$$;

-- Units of a ticket type or aso-ebi item held by unpaid, unexpired orders.
create function public.held_units(p_ticket_type uuid, p_asoebi uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(oi.quantity), 0)
  from public.order_items oi join public.orders o on o.id = oi.order_id
  where o.status = 'pending' and o.expires_at > now()
    and ((p_ticket_type is not null and oi.ticket_type_id = p_ticket_type)
      or (p_asoebi is not null and oi.asoebi_item_id = p_asoebi));
$$;

-- Checkout ------------------------------------------------------------------------------------

-- Validates the buyer's answers against the event's custom fields and returns
-- only known keys. Raises on a missing required answer.
create function public.clean_answers(fields jsonb, answers jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  f jsonb;
  val text;
  result jsonb := '{}';
begin
  answers := coalesce(answers, '{}');
  for f in select * from jsonb_array_elements(fields) loop
    val := btrim(coalesce(answers ->> (f ->> 'id'), ''));
    if val = '' then
      if coalesce((f ->> 'required')::boolean, false) then
        raise exception 'Please answer: %', f ->> 'label' using errcode = '22023';
      end if;
      continue;
    end if;
    if char_length(val) > 300 then
      raise exception '% is too long', f ->> 'label' using errcode = '22023';
    end if;
    if f ->> 'type' = 'select' and not (f -> 'options') ? val then
      raise exception 'Pick a valid option for %', f ->> 'label' using errcode = '22023';
    end if;
    result := result || jsonb_build_object(f ->> 'id', val);
  end loop;
  -- Contest entry details are always accepted.
  if btrim(coalesce(answers ->> 'bio', '')) <> '' then
    result := result || jsonb_build_object('bio', left(btrim(answers ->> 'bio'), 1000));
  end if;
  if coalesce(answers ->> 'photo_url', '') ~ '^https://' then
    result := result || jsonb_build_object('photo_url', left(answers ->> 'photo_url', 500));
  end if;
  return result;
end;
$$;

-- Shared by ticket and vote orders: turns a goods value into totals.
create function public.price_order(goods bigint, bearer text)
returns table (buyer_fee bigint, total bigint, commission bigint, platform_charge bigint)
language plpgsql stable set search_path = '' as $$
declare
  s public.platform_settings;
begin
  select * into s from public.platform_settings;
  commission := case when goods > 0
    then least(goods, round(goods * s.commission_bps / 10000.0)::bigint + s.commission_flat_kobo)
    else 0 end;
  if goods > 0 and bearer = 'buyer' then
    total := public.gross_up_for_fee(goods);
  else
    total := goods;
  end if;
  buyer_fee := total - goods;
  platform_charge := commission + buyer_fee;
  return next;
end;
$$;

-- Creates a pending order for the signed-in buyer. Items look like
--   [{ "ticket_type_id": "...", "quantity": 2 }, { "asoebi_item_id": "...", "quantity": 1 }]
-- Free orders (total 0) are fulfilled immediately.
create function public.create_order(
  p_event uuid,
  p_items jsonb,
  p_buyer_name text,
  p_buyer_phone text default '',
  p_answers jsonb default '{}',
  p_promo text default null,
  p_ref text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer uuid := auth.uid();
  buyer_email text;
  ev public.events;
  s public.platform_settings;
  item jsonb;
  qty integer;
  tt public.ticket_types;
  ai public.asoebi_items;
  lines jsonb := '[]';
  ticket_goods bigint := 0;
  goods bigint := 0;
  discount bigint := 0;
  promo public.promo_codes;
  promoter public.promoters;
  priced record;
  clean jsonb;
  new_order public.orders;
begin
  if buyer is null then
    raise exception 'Sign in to buy tickets' using errcode = '42501';
  end if;
  select email into buyer_email from auth.users where id = buyer;
  select * into s from public.platform_settings;

  select * into ev from public.events where id = p_event;
  if not found or ev.status not in ('published', 'postponed') then
    raise exception 'This event is not on sale' using errcode = '22023';
  end if;
  if ev.starts_at < now() - interval '6 hours' then
    raise exception 'This event has already happened' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 10 then
    raise exception 'Choose at least one item' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_buyer_name, ''))) = 0 then
    raise exception 'Enter the name for the ticket' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := coalesce((item ->> 'quantity')::integer, 0);
    if qty < 1 or qty > 50 then
      raise exception 'Invalid quantity' using errcode = '22023';
    end if;

    if item ? 'ticket_type_id' then
      -- Lock the row so two buyers cannot take the last ticket at once.
      select * into tt from public.ticket_types
      where id = (item ->> 'ticket_type_id')::uuid and event_id = p_event
      for update;
      if not found or tt.hidden then
        raise exception 'Ticket type not found' using errcode = '22023';
      end if;
      if tt.sale_starts_at is not null and now() < tt.sale_starts_at then
        raise exception '% is not on sale yet', tt.name using errcode = '22023';
      end if;
      if tt.sale_ends_at is not null and now() > tt.sale_ends_at then
        raise exception '% is no longer on sale', tt.name using errcode = '22023';
      end if;
      if qty > tt.max_per_order or (tt.kind = 'entry' and qty > 1) then
        raise exception 'You can buy at most % of %', case when tt.kind = 'entry' then 1 else tt.max_per_order end, tt.name using errcode = '22023';
      end if;
      if tt.quantity - tt.sold - public.held_units(tt.id, null) < qty then
        raise exception 'Only % left for %', greatest(tt.quantity - tt.sold - public.held_units(tt.id, null), 0), tt.name using errcode = 'P0001';
      end if;
      lines := lines || jsonb_build_object('item_type', 'ticket', 'ticket_type_id', tt.id, 'quantity', qty,
        'unit', tt.price_kobo, 'line', tt.price_kobo * qty);
      ticket_goods := ticket_goods + tt.price_kobo * qty;
      goods := goods + tt.price_kobo * qty;

    elsif item ? 'asoebi_item_id' then
      select * into ai from public.asoebi_items
      where id = (item ->> 'asoebi_item_id')::uuid and event_id = p_event and active
      for update;
      if not found then
        raise exception 'Aso-ebi item not found' using errcode = '22023';
      end if;
      if ai.stock - ai.sold - public.held_units(null, ai.id) < qty then
        raise exception 'Only % left of %', greatest(ai.stock - ai.sold - public.held_units(null, ai.id), 0), ai.name using errcode = 'P0001';
      end if;
      lines := lines || jsonb_build_object('item_type', 'asoebi', 'asoebi_item_id', ai.id, 'quantity', qty,
        'unit', ai.price_kobo, 'line', ai.price_kobo * qty);
      goods := goods + ai.price_kobo * qty;
    else
      raise exception 'Unknown item' using errcode = '22023';
    end if;
  end loop;

  -- Promo codes apply to tickets, not aso-ebi.
  if nullif(btrim(coalesce(p_promo, '')), '') is not null then
    select * into promo from public.promo_codes
    where event_id = p_event and code = upper(btrim(p_promo)) and active
      and (expires_at is null or expires_at > now())
      and (max_uses is null or used < max_uses);
    if not found then
      raise exception 'That promo code is not valid' using errcode = '22023';
    end if;
    discount := case when promo.percent_off is not null
      then round(ticket_goods * promo.percent_off / 100.0)::bigint
      else least(promo.amount_off_kobo, ticket_goods) end;
    goods := goods - discount;
  end if;

  if nullif(btrim(coalesce(p_ref, '')), '') is not null then
    select * into promoter from public.promoters where event_id = p_event and code = lower(btrim(p_ref));
  end if;

  clean := public.clean_answers(ev.form_fields, p_answers);
  select * into priced from public.price_order(goods, ev.fee_bearer);

  insert into public.orders (
    reference, buyer_id, event_id, kind, subtotal_kobo, discount_kobo, buyer_fee_kobo, total_kobo,
    commission_kobo, platform_charge_kobo, fee_bearer, promo_code_id, promoter_id, promoter_commission_kobo,
    buyer_name, buyer_email, buyer_phone, answers, expires_at
  ) values (
    public.new_order_reference(), buyer, p_event, 'purchase', goods + discount, discount, priced.buyer_fee, priced.total,
    priced.commission, priced.platform_charge, ev.fee_bearer, promo.id, promoter.id,
    case when promoter.id is null then 0 else round(goods * promoter.commission_bps / 10000.0)::bigint end,
    left(btrim(p_buyer_name), 120), buyer_email, left(btrim(coalesce(p_buyer_phone, '')), 30), clean,
    now() + make_interval(mins => s.order_hold_minutes)
  ) returning * into new_order;

  insert into public.order_items (order_id, item_type, ticket_type_id, asoebi_item_id, quantity, unit_price_kobo, line_total_kobo)
  select new_order.id, l ->> 'item_type', (l ->> 'ticket_type_id')::uuid, (l ->> 'asoebi_item_id')::uuid,
         (l ->> 'quantity')::integer, (l ->> 'unit')::bigint, (l ->> 'line')::bigint
  from jsonb_array_elements(lines) l;

  if new_order.total_kobo = 0 then
    perform public.fulfil_order(new_order.reference, 0, null);
  end if;

  return jsonb_build_object(
    'order_id', new_order.id, 'reference', new_order.reference,
    'subtotal_kobo', new_order.subtotal_kobo, 'discount_kobo', new_order.discount_kobo,
    'buyer_fee_kobo', new_order.buyer_fee_kobo, 'total_kobo', new_order.total_kobo,
    'free', new_order.total_kobo = 0, 'expires_at', new_order.expires_at
  );
end;
$$;

-- Paid votes: one package for one contestant.
create function public.create_vote_order(p_package uuid, p_contestant uuid, p_quantity integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer uuid := auth.uid();
  pkg public.vote_packages;
  c public.contests;
  who public.contestants;
  ev public.events;
  s public.platform_settings;
  priced record;
  goods bigint;
  new_order public.orders;
  buyer_email text;
begin
  if buyer is null then
    raise exception 'Sign in to vote' using errcode = '42501';
  end if;
  if p_quantity not between 1 and 20 then
    raise exception 'Invalid quantity' using errcode = '22023';
  end if;
  select * into pkg from public.vote_packages where id = p_package and active;
  select * into who from public.contestants where id = p_contestant and status = 'active';
  if pkg.id is null or who.id is null or pkg.contest_id <> who.contest_id then
    raise exception 'Vote package not found' using errcode = '22023';
  end if;
  select * into c from public.contests where id = pkg.contest_id;
  if now() not between c.voting_starts_at and c.voting_ends_at then
    raise exception 'Voting is closed' using errcode = '22023';
  end if;
  select * into ev from public.events where id = c.event_id;
  if ev.status not in ('published', 'postponed') then
    raise exception 'Voting is closed' using errcode = '22023';
  end if;

  select * into s from public.platform_settings;
  select email into buyer_email from auth.users where id = buyer;
  goods := pkg.price_kobo * p_quantity;
  select * into priced from public.price_order(goods, ev.fee_bearer);

  insert into public.orders (
    reference, buyer_id, event_id, kind, subtotal_kobo, buyer_fee_kobo, total_kobo,
    commission_kobo, platform_charge_kobo, fee_bearer, buyer_name, buyer_email, expires_at
  ) values (
    public.new_order_reference(), buyer, ev.id, 'votes', goods, priced.buyer_fee, priced.total,
    priced.commission, priced.platform_charge, ev.fee_bearer,
    coalesce(nullif((select full_name from public.profiles where id = buyer), ''), 'Voter'),
    buyer_email, now() + make_interval(mins => s.order_hold_minutes)
  ) returning * into new_order;

  insert into public.order_items (order_id, item_type, vote_package_id, contestant_id, quantity, unit_price_kobo, line_total_kobo)
  values (new_order.id, 'votes', pkg.id, who.id, p_quantity, pkg.price_kobo, goods);

  return jsonb_build_object('order_id', new_order.id, 'reference', new_order.reference,
    'total_kobo', new_order.total_kobo, 'votes', pkg.votes * p_quantity, 'expires_at', new_order.expires_at);
end;
$$;

create function public.issue_ticket(p_order uuid, p_event uuid, p_type uuid, p_holder text)
returns void language plpgsql set search_path = '' as $$
declare
  c text;
begin
  c := encode(extensions.gen_random_bytes(16), 'hex');
  insert into public.tickets (order_id, event_id, ticket_type_id, code, code_hash, holder_name)
  values (p_order, p_event, p_type, c, encode(extensions.digest(c, 'sha256'), 'hex'), p_holder);
end;
$$;

-- Marks an order paid and delivers what was bought. Called by the Paystack
-- webhook (service role) after the signature and amount are verified.
-- Safe to call more than once for the same reference.
create function public.fulfil_order(p_reference text, p_paid_kobo bigint, p_transaction_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  it record;
  n integer;
  seat integer;
  next_number integer;
  late boolean;
begin
  select * into o from public.orders where reference = p_reference for update;
  if not found then
    raise exception 'Unknown order %', p_reference using errcode = 'P0002';
  end if;
  if o.status in ('paid', 'refund_pending', 'refunded') then
    return jsonb_build_object('status', o.status, 'already', true);
  end if;
  if o.status = 'flagged' then
    return jsonb_build_object('status', 'flagged', 'already', true);
  end if;
  if p_paid_kobo is distinct from o.total_kobo then
    update public.orders set status = 'flagged', paid_kobo = p_paid_kobo, paystack_transaction_id = p_transaction_id
    where id = o.id;
    insert into public.flagged_transactions (order_id, reason, details)
    values (o.id, 'amount_mismatch', jsonb_build_object('expected', o.total_kobo, 'paid', p_paid_kobo, 'transaction', p_transaction_id));
    return jsonb_build_object('status', 'flagged');
  end if;

  late := o.expires_at < now();
  update public.orders
  set status = 'paid', paid_kobo = p_paid_kobo, paid_at = now(), paystack_transaction_id = p_transaction_id
  where id = o.id;

  for it in
    select oi.*, tt.kind as tt_kind, tt.seats as tt_seats, tt.name as tt_name, tt.contest_id as tt_contest, vp.votes as pkg_votes, vp.contest_id as pkg_contest
    from public.order_items oi
    left join public.ticket_types tt on tt.id = oi.ticket_type_id
    left join public.vote_packages vp on vp.id = oi.vote_package_id
    where oi.order_id = o.id
  loop
    if it.item_type = 'ticket' then
      update public.ticket_types set sold = sold + it.quantity where id = it.ticket_type_id;
      for n in 1..it.quantity loop
        if it.tt_kind = 'table' then
          -- One QR per seat, so guests at a table can arrive separately.
          for seat in 1..it.tt_seats loop
            perform public.issue_ticket(o.id, o.event_id, it.ticket_type_id,
              format('%s · %s %s, seat %s', o.buyer_name, it.tt_name, n, seat));
          end loop;
        else
          perform public.issue_ticket(o.id, o.event_id, it.ticket_type_id, o.buyer_name);
        end if;
        if it.tt_kind = 'entry' then
          select coalesce(max(number), 0) + 1 into next_number from public.contestants where contest_id = it.tt_contest;
          insert into public.contestants (contest_id, user_id, number, display_name, bio, photo_url)
          values (it.tt_contest, o.buyer_id, next_number, o.buyer_name,
                  coalesce(o.answers ->> 'bio', ''), o.answers ->> 'photo_url');
        end if;
      end loop;
    elsif it.item_type = 'asoebi' then
      update public.asoebi_items set sold = sold + it.quantity where id = it.asoebi_item_id;
    elsif it.item_type = 'votes' then
      insert into public.votes (contest_id, contestant_id, voter_id, kind, quantity, order_id)
      values (it.pkg_contest, it.contestant_id, o.buyer_id, 'paid', it.pkg_votes * it.quantity, o.id);
      update public.contestants set votes_count = votes_count + it.pkg_votes * it.quantity where id = it.contestant_id;
    end if;
  end loop;

  if o.promo_code_id is not null then
    update public.promo_codes set used = used + 1 where id = o.promo_code_id;
  end if;

  -- Paid after the hold ran out: stock may have been sold to someone else.
  if late and (
    exists (select 1 from public.ticket_types tt join public.order_items oi on oi.ticket_type_id = tt.id
            where oi.order_id = o.id and tt.sold > tt.quantity)
    or exists (select 1 from public.asoebi_items ai join public.order_items oi on oi.asoebi_item_id = ai.id
               where oi.order_id = o.id and ai.sold > ai.stock)
  ) then
    insert into public.flagged_transactions (order_id, reason, details)
    values (o.id, 'oversold_after_hold_expired', jsonb_build_object('reference', o.reference));
  end if;

  return jsonb_build_object('status', 'paid', 'tickets', (select count(*) from public.tickets where order_id = o.id));
end;
$$;

-- Complimentary tickets from a (usually hidden) ticket type.
create function public.issue_comp_tickets(p_ticket_type uuid, p_holder text, p_email text, p_count integer default 1)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tt public.ticket_types;
  new_order public.orders;
begin
  select * into tt from public.ticket_types where id = p_ticket_type for update;
  if not found or not public.owns_event(tt.event_id) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  if tt.kind = 'entry' then
    raise exception 'Contest entries cannot be complimentary' using errcode = '22023';
  end if;
  if p_count not between 1 and 50 then
    raise exception 'Issue between 1 and 50 at a time' using errcode = '22023';
  end if;
  if tt.quantity - tt.sold - public.held_units(tt.id, null) < p_count then
    raise exception 'Not enough left on %', tt.name using errcode = 'P0001';
  end if;
  insert into public.orders (reference, buyer_id, event_id, kind, subtotal_kobo, total_kobo, fee_bearer,
    buyer_name, buyer_email, expires_at)
  values (public.new_order_reference(), auth.uid(), tt.event_id, 'comp', 0, 0, 'seller',
    left(btrim(p_holder), 120), p_email, now())
  returning * into new_order;
  insert into public.order_items (order_id, item_type, ticket_type_id, quantity, unit_price_kobo, line_total_kobo)
  values (new_order.id, 'ticket', tt.id, p_count, 0, 0);
  perform public.fulfil_order(new_order.reference, 0, null);
  return jsonb_build_object('order_id', new_order.id, 'reference', new_order.reference);
end;
$$;

-- Door scanning ------------------------------------------------------------------------------------

create function public.check_in_ticket(p_event uuid, p_code text, p_device text default '', p_scanned_at timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tickets;
  outcome text;
  offline boolean := p_scanned_at is not null;
begin
  if not public.can_scan_event(p_event) then
    raise exception 'You are not door staff for this event' using errcode = '42501';
  end if;

  -- Atomic: only one scan can flip a ticket from valid to checked_in.
  update public.tickets
  set status = 'checked_in', checked_in_at = coalesce(p_scanned_at, now()), checked_in_by = auth.uid()
  where event_id = p_event and code = lower(btrim(p_code)) and status = 'valid'
  returning * into t;

  if found then
    outcome := 'admitted';
  else
    select * into t from public.tickets where event_id = p_event and code = lower(btrim(p_code));
    outcome := case when not found then 'unknown' when t.status = 'void' then 'void' else 'duplicate' end;
  end if;

  insert into public.ticket_scans (event_id, ticket_id, scanned_by, scanned_at, device_id, offline, result)
  values (p_event, t.id, auth.uid(), coalesce(p_scanned_at, now()), left(coalesce(p_device, ''), 80), offline, outcome);

  return jsonb_build_object(
    'result', outcome,
    'holder_name', t.holder_name,
    'ticket_type', (select name from public.ticket_types where id = t.ticket_type_id),
    'checked_in_at', t.checked_in_at
  );
end;
$$;

-- Everything an offline scanner needs, without the ticket codes themselves.
create function public.scanner_manifest(p_event uuid)
returns table (code_hash text, holder_name text, ticket_type text, status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_scan_event(p_event) then
    raise exception 'You are not door staff for this event' using errcode = '42501';
  end if;
  return query
    select t.code_hash, t.holder_name, tt.name, t.status
    from public.tickets t join public.ticket_types tt on tt.id = t.ticket_type_id
    where t.event_id = p_event;
end;
$$;

-- Uploads scans made while offline. The earliest scan wins; later ones come
-- back as duplicates so the device can show who got in first.
create function public.sync_offline_scans(p_event uuid, p_scans jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s jsonb;
  results jsonb := '[]';
begin
  if not public.can_scan_event(p_event) then
    raise exception 'You are not door staff for this event' using errcode = '42501';
  end if;
  if jsonb_typeof(p_scans) <> 'array' or jsonb_array_length(p_scans) > 2000 then
    raise exception 'Send up to 2000 scans at a time' using errcode = '22023';
  end if;
  for s in
    select value from jsonb_array_elements(p_scans) order by (value ->> 'scanned_at')::timestamptz
  loop
    results := results || (public.check_in_ticket(
      p_event, s ->> 'code', s ->> 'device_id',
      least(coalesce((s ->> 'scanned_at')::timestamptz, now()), now())
    ) || jsonb_build_object('code', s ->> 'code'));
  end loop;
  return results;
end;
$$;

create function public.add_event_staff(p_event uuid, p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  who uuid;
begin
  if not public.owns_event(p_event) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  select id into who from auth.users where lower(email) = lower(btrim(p_email));
  if who is null then
    return false;
  end if;
  insert into public.event_staff (event_id, user_id, added_by) values (p_event, who, auth.uid())
  on conflict do nothing;
  return true;
end;
$$;

-- Cancellations, postponements, refunds ---------------------------------------------------------

create function public.queue_refund(p_order uuid, p_reason text)
returns void language plpgsql set search_path = '' as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status <> 'paid' or o.total_kobo = 0 then
    return;
  end if;
  update public.orders set status = 'refund_pending' where id = o.id;
  update public.tickets set status = 'void' where order_id = o.id and status = 'valid';
  insert into public.refunds (order_id, amount_kobo, reason, requested_by)
  values (o.id, o.total_kobo, left(p_reason, 300), coalesce(auth.uid(), o.buyer_id))
  on conflict (order_id) do nothing;
end;
$$;

create function public.cancel_event(p_event uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  n integer := 0;
begin
  if not (public.owns_event(p_event) or public.is_super_admin()) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Tell ticket holders why the event is cancelled' using errcode = '22023';
  end if;
  update public.events set status = 'cancelled', status_note = left(btrim(p_reason), 500) where id = p_event;
  update public.tickets set status = 'void' where event_id = p_event and status = 'valid';
  for o in select id from public.orders where event_id = p_event and status = 'paid' and total_kobo > 0 loop
    perform public.queue_refund(o.id, 'Event cancelled: ' || btrim(p_reason));
    n := n + 1;
  end loop;
  return n;
end;
$$;

create function public.postpone_event(p_event uuid, p_new_start timestamptz, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_event(p_event) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  if p_new_start <= now() then
    raise exception 'Pick a future date' using errcode = '22023';
  end if;
  update public.events
  set status = 'postponed', starts_at = p_new_start, ends_at = null, status_note = left(btrim(coalesce(p_note, '')), 500)
  where id = p_event and status in ('published', 'postponed');
end;
$$;

-- Buyers may ask for their money back when an event is postponed.
create function public.request_refund(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  ev public.events;
begin
  select * into o from public.orders where id = p_order and buyer_id = auth.uid();
  if not found then
    raise exception 'Order not found' using errcode = '42501';
  end if;
  select * into ev from public.events where id = o.event_id;
  if ev.status <> 'postponed' then
    raise exception 'Refunds are available when an event is postponed or cancelled' using errcode = '22023';
  end if;
  if exists (select 1 from public.tickets where order_id = o.id and status = 'checked_in') then
    raise exception 'Some of these tickets were already used' using errcode = '22023';
  end if;
  perform public.queue_refund(o.id, 'Buyer asked for a refund after the event was postponed');
end;
$$;

-- Sellers can refund any order on their own event.
create function public.seller_refund_order(p_order uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order;
  if not found or not (public.owns_event(o.event_id) or public.is_super_admin()) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  perform public.queue_refund(o.id, coalesce(nullif(btrim(p_reason), ''), 'Refunded by organiser'));
end;
$$;

-- Called by the refund worker after Paystack confirms.
create function public.mark_refund(p_refund uuid, p_ok boolean, p_paystack_id text, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.refunds;
begin
  select * into r from public.refunds where id = p_refund for update;
  if p_ok then
    update public.refunds set status = 'processed', paystack_refund_id = p_paystack_id, processed_at = now(), last_error = null
    where id = r.id;
    update public.orders set status = 'refunded' where id = r.order_id;
  else
    update public.refunds set status = 'failed', last_error = left(p_error, 500) where id = r.id;
  end if;
end;
$$;

-- Voting ---------------------------------------------------------------------------------------------

create function public.cast_free_vote(p_contestant uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  who public.contestants;
  c public.contests;
  total bigint;
begin
  if auth.uid() is null then
    raise exception 'Sign in to vote' using errcode = '42501';
  end if;
  if not public.has_verified_phone() then
    raise exception 'Verify your phone number to cast a free vote' using errcode = '42501';
  end if;
  select * into who from public.contestants where id = p_contestant and status = 'active';
  if not found then
    raise exception 'Contestant not found' using errcode = '22023';
  end if;
  select * into c from public.contests where id = who.contest_id;
  if not c.free_votes_enabled or now() not between c.voting_starts_at and c.voting_ends_at
     or not public.event_is_public(c.event_id) then
    raise exception 'Free voting is closed' using errcode = '22023';
  end if;
  begin
    insert into public.votes (contest_id, contestant_id, voter_id, kind, quantity)
    values (c.id, who.id, auth.uid(), 'free', 1);
  exception when unique_violation then
    raise exception 'You have already used your free vote in this contest' using errcode = '23505';
  end;
  update public.contestants set votes_count = votes_count + 1 where id = who.id returning votes_count into total;
  return total;
end;
$$;

-- Sellers and admin ---------------------------------------------------------------------------------

-- Called by the approve-seller function after the Paystack subaccount exists.
create function public.finalize_seller_approval(p_application uuid, p_subaccount text, p_slug text, p_admin uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.seller_applications;
begin
  select * into a from public.seller_applications where id = p_application and status = 'pending' for update;
  if not found then
    raise exception 'Application is not pending' using errcode = '22023';
  end if;
  update public.seller_applications
  set status = 'approved', reviewed_by = p_admin, reviewed_at = now()
  where id = a.id;
  insert into public.sellers (user_id, display_name, slug, instagram, bio)
  values (a.user_id, a.business_name, p_slug, a.instagram, a.about)
  on conflict (user_id) do update set suspended = false;
  insert into public.seller_payout_accounts (user_id, subaccount_code, bank_name, account_last4, account_name)
  values (a.user_id, p_subaccount, a.bank_name, right(a.account_number, 4), a.account_name)
  on conflict (user_id) do update set subaccount_code = excluded.subaccount_code, bank_name = excluded.bank_name,
    account_last4 = excluded.account_last4, account_name = excluded.account_name;
  update public.profiles set role = 'seller' where id = a.user_id and role = 'user';
end;
$$;

create function public.reject_seller_application(p_application uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.seller_applications
  set status = 'rejected', admin_note = left(btrim(coalesce(p_note, '')), 500), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_application and status = 'pending';
end;
$$;

create function public.resolve_flag(p_flag uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  update public.flagged_transactions set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
  where id = p_flag;
end;
$$;

-- Sales summary for the seller dashboard (and admins).
create function public.event_sales(p_event uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.owns_event(p_event) or public.is_super_admin()) then
    raise exception 'Not your event' using errcode = '42501';
  end if;
  return (
    select jsonb_build_object(
      'orders', count(*) filter (where o.status = 'paid' and o.kind <> 'comp'),
      'gross_kobo', coalesce(sum(o.total_kobo) filter (where o.status = 'paid'), 0),
      'buyer_fees_kobo', coalesce(sum(o.buyer_fee_kobo) filter (where o.status = 'paid'), 0),
      'commission_kobo', coalesce(sum(o.commission_kobo) filter (where o.status = 'paid'), 0),
      'seller_net_kobo', coalesce(sum(
        o.total_kobo - o.platform_charge_kobo
        - case when o.fee_bearer = 'seller' then public.paystack_fee(o.total_kobo) else 0 end
      ) filter (where o.status = 'paid'), 0),
      'refunded_kobo', coalesce(sum(o.total_kobo) filter (where o.status in ('refund_pending', 'refunded')), 0),
      'tickets_issued', (select count(*) from public.tickets t where t.event_id = p_event and t.status <> 'void'),
      'checked_in', (select count(*) from public.tickets t where t.event_id = p_event and t.status = 'checked_in'),
      'promoters', (
        select coalesce(jsonb_agg(jsonb_build_object('name', p.name, 'code', p.code,
          'orders', (select count(*) from public.orders x where x.promoter_id = p.id and x.status = 'paid'),
          'owed_kobo', (select coalesce(sum(x.promoter_commission_kobo), 0) from public.orders x where x.promoter_id = p.id and x.status = 'paid'))
        order by p.name), '[]')
        from public.promoters p where p.event_id = p_event
      )
    )
    from public.orders o where o.event_id = p_event
  );
end;
$$;

-- Column guards ---------------------------------------------------------------------------------
-- Counters and money-related columns are maintained by the functions above.
-- Browser clients (anon/authenticated) cannot change them directly.

create function public.guard_counters()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_table_name = 'ticket_types' then
    if new.sold is distinct from old.sold or new.event_id is distinct from old.event_id then
      raise exception 'sold and event cannot be edited' using errcode = '42501';
    end if;
    if new.quantity < old.sold then
      raise exception 'Quantity cannot go below the % already sold', old.sold using errcode = '22023';
    end if;
  elsif tg_table_name = 'asoebi_items' then
    if new.sold is distinct from old.sold or new.event_id is distinct from old.event_id then
      raise exception 'sold and event cannot be edited' using errcode = '42501';
    end if;
  elsif tg_table_name = 'promo_codes' then
    if new.used is distinct from old.used or new.event_id is distinct from old.event_id then
      raise exception 'used and event cannot be edited' using errcode = '42501';
    end if;
  elsif tg_table_name = 'contestants' then
    if new.votes_count is distinct from old.votes_count or new.contest_id is distinct from old.contest_id
       or new.number is distinct from old.number or new.user_id is distinct from old.user_id then
      raise exception 'Votes and contestant numbers cannot be edited' using errcode = '42501';
    end if;
  elsif tg_table_name = 'sellers' then
    if (new.suspended is distinct from old.suspended or new.slug is distinct from old.slug)
       and not public.is_super_admin() then
      raise exception 'Only an admin can change this' using errcode = '42501';
    end if;
  elsif tg_table_name = 'events' then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'Event owner cannot change' using errcode = '42501';
    end if;
    if new.status is distinct from old.status and new.status not in ('draft', 'published', 'ended') then
      raise exception 'Use cancel or postpone so ticket holders are refunded and told' using errcode = '22023';
    end if;
    if old.status in ('cancelled', 'ended') and new.status is distinct from old.status then
      raise exception 'This event is closed' using errcode = '22023';
    end if;
    if new.status = 'draft' and old.status <> 'draft'
       and exists (select 1 from public.orders o where o.event_id = old.id) then
      raise exception 'An event with orders cannot go back to draft' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

create trigger ticket_types_guard before update on public.ticket_types for each row execute function public.guard_counters();
create trigger asoebi_items_guard before update on public.asoebi_items for each row execute function public.guard_counters();
create trigger promo_codes_guard before update on public.promo_codes for each row execute function public.guard_counters();
create trigger contestants_guard before update on public.contestants for each row execute function public.guard_counters();
create trigger sellers_guard before update on public.sellers for each row execute function public.guard_counters();
create trigger events_guard before update on public.events for each row execute function public.guard_counters();

-- Inserts from browsers start counters at zero.
create function public.guard_counter_inserts()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_table_name in ('ticket_types', 'asoebi_items') then new.sold := 0; end if;
    if tg_table_name = 'promo_codes' then new.used := 0; end if;
    if tg_table_name = 'contestants' then
      new.votes_count := 0;
      select coalesce(max(number), 0) + 1 into new.number from public.contestants where contest_id = new.contest_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger ticket_types_guard_insert before insert on public.ticket_types for each row execute function public.guard_counter_inserts();
create trigger asoebi_items_guard_insert before insert on public.asoebi_items for each row execute function public.guard_counter_inserts();
create trigger promo_codes_guard_insert before insert on public.promo_codes for each row execute function public.guard_counter_inserts();
create trigger contestants_guard_insert before insert on public.contestants for each row execute function public.guard_counter_inserts();

-- Row level security -------------------------------------------------------------------------------

alter table public.platform_settings enable row level security;
alter table public.seller_applications enable row level security;
alter table public.sellers enable row level security;
alter table public.seller_payout_accounts enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promoters enable row level security;
alter table public.asoebi_items enable row level security;
alter table public.contests enable row level security;
alter table public.contestants enable row level security;
alter table public.vote_packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.tickets enable row level security;
alter table public.event_staff enable row level security;
alter table public.ticket_scans enable row level security;
alter table public.votes enable row level security;
alter table public.refunds enable row level security;
alter table public.flagged_transactions enable row level security;

create policy "Anyone reads fees and commission" on public.platform_settings
  for select to anon, authenticated using (true);
create policy "Admins change settings" on public.platform_settings
  for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy "Applicants and admins read applications" on public.seller_applications
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());
-- Inserted by the seller-apply function after Paystack verifies the bank account.

create policy "Anyone reads active sellers" on public.sellers
  for select to anon, authenticated using (not suspended or user_id = auth.uid() or public.is_super_admin());
create policy "Sellers edit their profile, admins edit any" on public.sellers
  for update to authenticated
  using (user_id = auth.uid() or public.is_super_admin())
  with check (user_id = auth.uid() or public.is_super_admin());

create policy "Sellers and admins read payout accounts" on public.seller_payout_accounts
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

create policy "Anyone reads live events" on public.events
  for select to anon, authenticated
  using (status <> 'draft' or seller_id = auth.uid() or public.is_super_admin());
create policy "Sellers create events" on public.events
  for insert to authenticated
  with check (seller_id = auth.uid() and public.is_active_seller() and status in ('draft', 'published'));
create policy "Sellers edit their events" on public.events
  for update to authenticated
  using (seller_id = auth.uid() or public.is_super_admin())
  with check (seller_id = auth.uid() or public.is_super_admin());
create policy "Sellers delete draft events" on public.events
  for delete to authenticated
  using (seller_id = auth.uid() and status = 'draft');

create policy "Anyone reads on-sale ticket types" on public.ticket_types
  for select to anon, authenticated
  using ((not hidden and public.event_is_public(event_id)) or public.owns_event(event_id) or public.is_super_admin());
create policy "Sellers add ticket types" on public.ticket_types
  for insert to authenticated with check (public.owns_event(event_id));
create policy "Sellers edit ticket types" on public.ticket_types
  for update to authenticated using (public.owns_event(event_id)) with check (public.owns_event(event_id));
create policy "Sellers delete unsold ticket types" on public.ticket_types
  for delete to authenticated using (public.owns_event(event_id) and sold = 0);

create policy "Sellers manage promo codes" on public.promo_codes
  for all to authenticated using (public.owns_event(event_id)) with check (public.owns_event(event_id));
create policy "Admins read promo codes" on public.promo_codes
  for select to authenticated using (public.is_super_admin());

create policy "Sellers manage promoters" on public.promoters
  for all to authenticated using (public.owns_event(event_id)) with check (public.owns_event(event_id));
create policy "Admins read promoters" on public.promoters
  for select to authenticated using (public.is_super_admin());

create policy "Anyone reads aso-ebi on sale" on public.asoebi_items
  for select to anon, authenticated
  using ((active and public.event_is_public(event_id)) or public.owns_event(event_id) or public.is_super_admin());
create policy "Sellers add aso-ebi" on public.asoebi_items
  for insert to authenticated with check (public.owns_event(event_id));
create policy "Sellers edit aso-ebi" on public.asoebi_items
  for update to authenticated using (public.owns_event(event_id)) with check (public.owns_event(event_id));
create policy "Sellers delete unsold aso-ebi" on public.asoebi_items
  for delete to authenticated using (public.owns_event(event_id) and sold = 0);

create policy "Anyone reads contests on live events" on public.contests
  for select to anon, authenticated
  using (public.event_is_public(event_id) or public.owns_event(event_id) or public.is_super_admin());
create policy "Sellers manage contests" on public.contests
  for all to authenticated using (public.owns_event(event_id)) with check (public.owns_event(event_id));

create policy "Anyone reads contestants on live events" on public.contestants
  for select to anon, authenticated
  using (public.event_is_public(public.contest_event(contest_id)) or public.owns_event(public.contest_event(contest_id)) or public.is_super_admin());
create policy "Sellers add contestants" on public.contestants
  for insert to authenticated with check (public.owns_event(public.contest_event(contest_id)));
create policy "Sellers and contestants edit profiles" on public.contestants
  for update to authenticated
  using (public.owns_event(public.contest_event(contest_id)) or user_id = auth.uid())
  with check (public.owns_event(public.contest_event(contest_id)) or user_id = auth.uid());

create policy "Anyone reads vote packages" on public.vote_packages
  for select to anon, authenticated
  using (public.event_is_public(public.contest_event(contest_id)) or public.owns_event(public.contest_event(contest_id)));
create policy "Sellers manage vote packages" on public.vote_packages
  for all to authenticated
  using (public.owns_event(public.contest_event(contest_id)))
  with check (public.owns_event(public.contest_event(contest_id)));

create function public.can_see_order(target_order uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.orders o
    where o.id = target_order
      and (o.buyer_id = auth.uid() or public.owns_event(o.event_id) or public.is_super_admin())
  );
$$;

create policy "Buyers, sellers and admins read orders" on public.orders
  for select to authenticated
  using (buyer_id = auth.uid() or public.owns_event(event_id) or public.is_super_admin());
create policy "Read items of visible orders" on public.order_items
  for select to authenticated using (public.can_see_order(order_id));
create policy "Sellers mark aso-ebi collected" on public.order_items
  for update to authenticated
  using (public.owns_event((select o.event_id from public.orders o where o.id = order_id)))
  with check (public.owns_event((select o.event_id from public.orders o where o.id = order_id)));

create policy "Holders, sellers and admins read tickets" on public.tickets
  for select to authenticated using (public.can_see_order(order_id));

create policy "Sellers and staff see the door team" on public.event_staff
  for select to authenticated using (public.owns_event(event_id) or user_id = auth.uid());
create policy "Sellers remove door staff" on public.event_staff
  for delete to authenticated using (public.owns_event(event_id));

create policy "Door team reads scans" on public.ticket_scans
  for select to authenticated using (public.can_scan_event(event_id) or public.is_super_admin());

create policy "Voters, sellers and admins read votes" on public.votes
  for select to authenticated
  using (voter_id = auth.uid() or public.owns_event(public.contest_event(contest_id)) or public.is_super_admin());

create policy "Buyers, sellers and admins read refunds" on public.refunds
  for select to authenticated using (public.can_see_order(order_id));

create policy "Admins read flags" on public.flagged_transactions
  for select to authenticated using (public.is_super_admin());

-- Only order_items.collected is editable by sellers.
create function public.guard_order_item_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') and
     (row(new.order_id, new.item_type, new.ticket_type_id, new.asoebi_item_id, new.vote_package_id,
          new.contestant_id, new.quantity, new.unit_price_kobo, new.line_total_kobo)
      is distinct from
      row(old.order_id, old.item_type, old.ticket_type_id, old.asoebi_item_id, old.vote_package_id,
          old.contestant_id, old.quantity, old.unit_price_kobo, old.line_total_kobo)) then
    raise exception 'Only the collected flag can change' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger order_items_guard before update on public.order_items
  for each row execute function public.guard_order_item_update();

-- Function permissions -----------------------------------------------------------------------------
-- Supabase lets anon/authenticated execute public functions by default, so
-- every function is locked first and then opened deliberately.

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'paystack_fee', 'gross_up_for_fee', 'new_order_reference', 'held_units', 'clean_answers', 'price_order',
        'create_order', 'create_vote_order', 'issue_ticket', 'fulfil_order', 'issue_comp_tickets',
        'check_in_ticket', 'scanner_manifest', 'sync_offline_scans', 'add_event_staff', 'queue_refund',
        'cancel_event', 'postpone_event', 'request_refund', 'seller_refund_order', 'mark_refund',
        'cast_free_vote', 'finalize_seller_approval', 'reject_seller_application', 'resolve_flag',
        'event_sales', 'is_active_seller', 'owns_event', 'can_scan_event', 'event_is_public',
        'contest_event', 'can_see_order', 'guard_counters', 'guard_counter_inserts', 'guard_order_item_update'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end;
$$;

-- Helpers used inside RLS policies. Public pages evaluate policies as anon;
-- is_super_admin() simply returns false when nobody is signed in.
grant execute on function public.is_super_admin() to anon;
grant execute on function public.is_active_seller() to authenticated;
grant execute on function public.owns_event(uuid) to anon, authenticated;
grant execute on function public.can_scan_event(uuid) to authenticated;
grant execute on function public.event_is_public(uuid) to anon, authenticated;
grant execute on function public.contest_event(uuid) to anon, authenticated;
grant execute on function public.can_see_order(uuid) to authenticated;

-- Actions signed-in people may take (each checks its own permissions).
grant execute on function public.paystack_fee(bigint) to anon, authenticated;
grant execute on function public.create_order(uuid, jsonb, text, text, jsonb, text, text) to authenticated;
grant execute on function public.create_vote_order(uuid, uuid, integer) to authenticated;
grant execute on function public.issue_comp_tickets(uuid, text, text, integer) to authenticated;
grant execute on function public.check_in_ticket(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.scanner_manifest(uuid) to authenticated;
grant execute on function public.sync_offline_scans(uuid, jsonb) to authenticated;
grant execute on function public.add_event_staff(uuid, text) to authenticated;
grant execute on function public.cancel_event(uuid, text) to authenticated;
grant execute on function public.postpone_event(uuid, timestamptz, text) to authenticated;
grant execute on function public.request_refund(uuid) to authenticated;
grant execute on function public.seller_refund_order(uuid, text) to authenticated;
grant execute on function public.cast_free_vote(uuid) to authenticated;
grant execute on function public.reject_seller_application(uuid, text) to authenticated;
grant execute on function public.resolve_flag(uuid) to authenticated;
grant execute on function public.event_sales(uuid) to authenticated;
-- fulfil_order, finalize_seller_approval, mark_refund, queue_refund, issue_ticket:
-- service role only (Edge Functions).

-- Live leaderboards.
alter publication supabase_realtime add table public.contestants;
