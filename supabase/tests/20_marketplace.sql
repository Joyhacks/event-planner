-- Marketplace security and money tests. Runs on plain Postgres (with the stub)
-- or on a local Supabase database. Every check must pass or the run aborts.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

-- Helpers -----------------------------------------------------------------------------
create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, false);
end $$;
create function pg_temp.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', false);
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
end $$;
create function pg_temp.as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '', false);
end $$;
create function pg_temp.as_service() returns void language plpgsql as $$
begin
  perform set_config('role', 'service_role', false);
  perform set_config('request.jwt.claims', '{"role":"service_role"}', false);
end $$;
create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok  %', what;
end $$;
create function pg_temp.fails(stmt text, what text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    raise notice 'ok  % (%)', what, sqlerrm;
    return;
  end;
  raise exception 'FAILED: % (statement succeeded)', what;
end $$;
create function pg_temp.id(name text) returns uuid language sql as $$
  select ('00000000-0000-0000-0000-0000000000' || case name
    when 'admin' then 'a1' when 'seller' then 'b1' when 'buyer' then 'c1'
    when 'stranger' then 'd1' when 'staff' then 'e1' when 'entrant' then 'f1' end)::uuid
$$;

select pg_temp.as_owner();
insert into auth.users (id, email, raw_user_meta_data) values
  (pg_temp.id('admin'), 'admin@ariya.test', '{"full_name":"Ada Admin"}'),
  (pg_temp.id('seller'), 'seller@ariya.test', '{"full_name":"Sola Seller"}'),
  (pg_temp.id('buyer'), 'buyer@ariya.test', '{"full_name":"Bisi Buyer"}'),
  (pg_temp.id('stranger'), 'stranger@ariya.test', '{"full_name":"Xavier"}'),
  (pg_temp.id('staff'), 'door@ariya.test', '{"full_name":"Tobi Door"}'),
  (pg_temp.id('entrant'), 'entrant@ariya.test', '{"full_name":"Queen Amaka"}');
update public.profiles set role = 'super_admin' where id = pg_temp.id('admin');

-- 1. Seller onboarding ----------------------------------------------------------------
-- (The seller-apply Edge Function inserts after Paystack resolves the account.)
insert into public.seller_applications (id, user_id, business_name, phone, bank_code, bank_name, account_number, account_name)
values ('10000000-0000-0000-0000-000000000001', pg_temp.id('seller'), 'Sola Events', '+2348030000000', '058', 'GTBank', '0123456789', 'SOLA ADEBAYO');

select pg_temp.as_user(pg_temp.id('stranger')::text);
select pg_temp.ok((select count(*) = 0 from public.seller_applications), 'strangers cannot read applications');
select pg_temp.fails($$select public.fulfil_order('x', 0, null)$$, 'buyers cannot call fulfil_order');
select pg_temp.fails($$select public.finalize_seller_approval('10000000-0000-0000-0000-000000000001', 'ACCT_x', 'x-y', null)$$,
  'buyers cannot approve sellers');
select pg_temp.fails($$insert into public.events (seller_id, slug, title, city, starts_at) values (auth.uid(), 'nope', 'Nope', 'Lagos', now() + interval '1 day')$$,
  'non-sellers cannot create events');
select pg_temp.fails($$insert into public.seller_applications (user_id, business_name, phone, bank_code, bank_name, account_number, account_name) values (auth.uid(), 'Fake', '08030000000', '058', 'GTB', '0000000000', 'ANYONE')$$,
  'applications cannot be inserted from the browser (bank name must be verified)');

select pg_temp.as_user(pg_temp.id('seller')::text);
select pg_temp.ok((select count(*) = 1 from public.seller_applications), 'applicant sees own application');

select pg_temp.as_service();
select public.finalize_seller_approval('10000000-0000-0000-0000-000000000001', 'ACCT_sola', 'sola-events', pg_temp.id('admin'));
select pg_temp.as_owner();
select pg_temp.ok((select role = 'seller' from public.profiles where id = pg_temp.id('seller')), 'approval makes the applicant a seller');

select pg_temp.as_anon();
select pg_temp.ok((select count(*) = 1 from public.sellers), 'public can see the seller profile');
select pg_temp.ok((select count(*) = 0 from public.seller_payout_accounts), 'public cannot see payout accounts');

-- 2. Seller builds an event ------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('seller')::text);
insert into public.events (id, seller_id, slug, title, city, starts_at, fee_bearer, form_fields)
values ('20000000-0000-0000-0000-000000000001', auth.uid(), 'detty-owambe', 'Detty Owambe', 'Lagos', now() + interval '30 days', 'buyer',
        '[{"id":"tshirt","label":"T-shirt size","type":"select","required":true,"options":["S","M","L"]}]');
insert into public.ticket_types (id, event_id, name, kind, seats, price_kobo, quantity, sold) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Regular', 'single', 1, 500000, 2, 999),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Gold table for 10', 'table', 10, 50000000, 1, 0),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'Free RSVP', 'single', 1, 0, 50, 0);
insert into public.ticket_types (id, event_id, name, price_kobo, quantity, hidden) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'VIP comp', 0, 20, true);
insert into public.ticket_types (id, event_id, name, price_kobo, quantity, sale_starts_at, sale_ends_at) values
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'Early bird', 300000, 10, now() - interval '10 days', now() - interval '1 day');
insert into public.promo_codes (event_id, code, percent_off, used) values ('20000000-0000-0000-0000-000000000001', 'EARLY10', 10, 50);
insert into public.promoters (event_id, name, code, commission_bps) values ('20000000-0000-0000-0000-000000000001', 'Tunde Hype', 'tunde', 1000);
insert into public.asoebi_items (id, event_id, name, price_kobo, stock) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Gold aso-oke set', 4500000, 5);

select pg_temp.ok((select sold = 0 from public.ticket_types where id = '30000000-0000-0000-0000-000000000001'), 'sellers cannot fake a sold count on insert');
select pg_temp.ok((select used = 0 from public.promo_codes where code = 'EARLY10'), 'promo usage starts at zero');

select pg_temp.as_anon();
select pg_temp.ok((select count(*) = 0 from public.events), 'draft events are private');

select pg_temp.as_user(pg_temp.id('seller')::text);
update public.events set status = 'published' where id = '20000000-0000-0000-0000-000000000001';
select pg_temp.fails($$update public.events set status = 'cancelled' where id = '20000000-0000-0000-0000-000000000001'$$,
  'sellers must use cancel_event so buyers get refunds');
select pg_temp.fails($$update public.ticket_types set sold = 5 where id = '30000000-0000-0000-0000-000000000001'$$,
  'sellers cannot edit sold counts');

select pg_temp.as_anon();
select pg_temp.ok((select count(*) = 1 from public.events), 'published event is public');
select pg_temp.ok((select count(*) = 4 from public.ticket_types), 'public sees on-sale ticket types but not the hidden comp type');
select pg_temp.ok((select count(*) = 0 from public.promo_codes), 'public cannot list promo codes');
select pg_temp.ok((select count(*) = 0 from public.promoters), 'public cannot list promoters');
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":1}]', 'Anon')$$,
  'anonymous visitors cannot create orders');

-- 3. Checkout maths and stock -----------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":2}]', 'Bisi')$$,
  'required custom field is enforced');
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":1}]', 'Bisi', '', '{"tshirt":"XXL"}')$$,
  'select fields only accept listed options');
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000003","quantity":1}]', 'Bisi', '', '{"tshirt":"M"}')$$,
  'hidden comp tickets cannot be bought');
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000005","quantity":1}]', 'Bisi', '', '{"tshirt":"M"}')$$,
  'early bird cannot be bought after it ends');
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":1}]', 'Bisi', '', '{"tshirt":"M"}', 'FAKECODE')$$,
  'unknown promo codes are rejected');

create temp table o1 as select public.create_order('20000000-0000-0000-0000-000000000001',
  '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":2},{"asoebi_item_id":"40000000-0000-0000-0000-000000000001","quantity":2}]',
  'Bisi Buyer', '0803', '{"tshirt":"M","hack":"ignored"}', 'early10', 'TUNDE') as r;
grant select on o1 to public;

select pg_temp.as_owner();
select pg_temp.ok((select subtotal_kobo = 1000000 + 9000000 and discount_kobo = 100000 from public.orders), 'subtotal and 10% promo on tickets only');
select pg_temp.ok((select total_kobo - public.paystack_fee(total_kobo) >= 9900000
                       and total_kobo - 1 - public.paystack_fee(total_kobo - 1) < 9900000 from public.orders),
  'buyer-paid fee grosses up exactly: seller goods value survives Paystack fee');
select pg_temp.ok((select commission_kobo = 495000 from public.orders), '5% commission on goods after discount');
select pg_temp.ok((select platform_charge_kobo = commission_kobo + buyer_fee_kobo from public.orders), 'platform charge = commission + buyer fee');
select pg_temp.ok((select promoter_commission_kobo = 990000 from public.orders), 'promoter link recorded with 10% commission');
select pg_temp.ok((select answers = '{"tshirt":"M"}'::jsonb from public.orders), 'unknown answer keys are dropped');

select pg_temp.as_user(pg_temp.id('stranger')::text);
select pg_temp.fails($$select public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000001","quantity":1}]', 'X', '', '{"tshirt":"S"}')$$,
  'tickets held by a pending order cannot be sold twice');
select pg_temp.ok((select count(*) = 0 from public.orders), 'strangers cannot see other buyers orders');

-- 4. Payment confirmation ---------------------------------------------------------------------
select pg_temp.as_service();
select pg_temp.ok((public.fulfil_order((select r ->> 'reference' from o1), (select (r ->> 'total_kobo')::bigint from o1), 'trx_1') ->> 'status') = 'paid',
  'correct amount marks the order paid');
select pg_temp.ok((public.fulfil_order((select r ->> 'reference' from o1), (select (r ->> 'total_kobo')::bigint from o1), 'trx_1') ->> 'already') = 'true',
  'repeated webhook is ignored (idempotent)');

select pg_temp.as_owner();
select pg_temp.ok((select count(*) = 2 from public.tickets), 'two tickets issued');
select pg_temp.ok((select sold = 2 from public.ticket_types where id = '30000000-0000-0000-0000-000000000001'), 'sold count updated once');
select pg_temp.ok((select sold = 2 from public.asoebi_items), 'aso-ebi stock updated');
select pg_temp.ok((select used = 1 from public.promo_codes), 'promo use counted once');
select pg_temp.ok((select bool_and(code ~ '^[0-9a-f]{32}$' and code_hash = encode(extensions.digest(code, 'sha256'), 'hex')) from public.tickets),
  'ticket codes are 128-bit random with sha256 hashes');

-- Wrong amount gets flagged, not fulfilled.
select pg_temp.as_user(pg_temp.id('buyer')::text);
create temp table o2 as select public.create_order('20000000-0000-0000-0000-000000000001',
  '[{"ticket_type_id":"30000000-0000-0000-0000-000000000002","quantity":1}]', 'Bisi Buyer', '', '{"tshirt":"L"}') as r;
grant select on o2 to public;
select pg_temp.as_service();
select pg_temp.ok((public.fulfil_order((select r ->> 'reference' from o2), 100, 'trx_cheap') ->> 'status') = 'flagged',
  'underpayment is flagged');
select pg_temp.as_owner();
select pg_temp.ok((select count(*) = 0 from public.tickets t join public.orders o on o.id = t.order_id where o.reference = (select r ->> 'reference' from o2)),
  'flagged order issues no tickets');
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.ok((select count(*) = 0 from public.flagged_transactions), 'buyers cannot see flags');
select pg_temp.as_user(pg_temp.id('admin')::text);
select pg_temp.ok((select count(*) = 1 from public.flagged_transactions where reason = 'amount_mismatch'), 'admin sees the flag');

-- Table ticket: one QR per seat.
select pg_temp.as_owner();
update public.orders set status = 'pending', paid_kobo = null where reference = (select r ->> 'reference' from o2);
select pg_temp.as_service();
select public.fulfil_order((select r ->> 'reference' from o2), (select (r ->> 'total_kobo')::bigint from o2), 'trx_table');
select pg_temp.as_owner();
select pg_temp.ok((select count(*) = 10 from public.tickets t join public.orders o on o.id = t.order_id where o.reference = (select r ->> 'reference' from o2)),
  'a table for 10 issues 10 seat passes');

-- Free RSVP is confirmed instantly.
select pg_temp.as_user(pg_temp.id('stranger')::text);
select pg_temp.ok((public.create_order('20000000-0000-0000-0000-000000000001', '[{"ticket_type_id":"30000000-0000-0000-0000-000000000004","quantity":1}]', 'Xavier', '', '{"tshirt":"S"}') ->> 'free') = 'true',
  'free tickets skip payment');
select pg_temp.ok((select count(*) = 1 from public.tickets), 'free ticket issued and visible to its holder');

-- 5. Tickets are private and read-only ----------------------------------------------------------
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.ok((select count(*) = 12 from public.tickets), 'buyer sees own 12 tickets only');
update public.tickets set status = 'valid', holder_name = 'Hacked';
select pg_temp.as_owner();
select pg_temp.ok((select count(*) = 0 from public.tickets where holder_name = 'Hacked'), 'buyers cannot edit tickets');

-- 6. Door scanning ---------------------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('staff')::text);
select pg_temp.fails($$select public.check_in_ticket('20000000-0000-0000-0000-000000000001', 'abc')$$, 'non-staff cannot scan');
select pg_temp.as_user(pg_temp.id('seller')::text);
select pg_temp.ok(public.add_event_staff('20000000-0000-0000-0000-000000000001', 'DOOR@ariya.test'), 'seller adds door staff by email');

select pg_temp.as_owner();
create temp table codes as select code, row_number() over (order by created_at, id) n from public.tickets
  where order_id = (select id from public.orders where reference = (select r ->> 'reference' from o1));
grant select on codes to authenticated;

select pg_temp.as_user(pg_temp.id('staff')::text);
select pg_temp.ok((public.check_in_ticket('20000000-0000-0000-0000-000000000001', (select code from codes where n = 1), 'gate-1') ->> 'result') = 'admitted', 'valid ticket admitted');
select pg_temp.ok((public.check_in_ticket('20000000-0000-0000-0000-000000000001', upper((select code from codes where n = 1)), 'gate-2') ->> 'result') = 'duplicate', 'second scan is a duplicate');
select pg_temp.ok((public.check_in_ticket('20000000-0000-0000-0000-000000000001', 'ffffffffffffffffffffffffffffffff', 'gate-1') ->> 'result') = 'unknown', 'fake code is unknown');
select pg_temp.ok((select count(*) > 0 and bool_and(code_hash ~ '^[0-9a-f]{64}$') from public.scanner_manifest('20000000-0000-0000-0000-000000000001')),
  'offline manifest has hashes, not codes');
select pg_temp.ok((select jsonb_agg(x ->> 'result' order by ord) = '["admitted","duplicate"]'::jsonb
  from jsonb_array_elements(public.sync_offline_scans('20000000-0000-0000-0000-000000000001', jsonb_build_array(
    jsonb_build_object('code', (select code from codes where n = 2), 'scanned_at', now() - interval '5 minutes', 'device_id', 'gate-2'),
    jsonb_build_object('code', (select code from codes where n = 2), 'scanned_at', now() - interval '10 minutes', 'device_id', 'gate-1')
  ))) with ordinality as t(x, ord)),
  'offline sync: earliest scan wins, the other is a duplicate');
select pg_temp.ok((select count(*) = 5 from public.ticket_scans), 'every scan is logged');

-- 7. Comps ---------------------------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.fails($$select public.issue_comp_tickets('30000000-0000-0000-0000-000000000003', 'Me', 'buyer@ariya.test', 2)$$, 'buyers cannot issue comps');
select pg_temp.as_user(pg_temp.id('seller')::text);
select public.issue_comp_tickets('30000000-0000-0000-0000-000000000003', 'Alhaji Musa', 'musa@example.test', 2);
select pg_temp.ok((select count(*) = 2 from public.tickets t join public.ticket_types tt on tt.id = t.ticket_type_id where tt.hidden), 'seller issues complimentary tickets');

-- 8. Contests and votes --------------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('seller')::text);
insert into public.contests (id, event_id, title, voting_starts_at, voting_ends_at, permit_confirmed)
values ('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Face of Detty Owambe', now() - interval '1 day', now() + interval '10 days', true);
insert into public.contestants (id, contest_id, display_name, votes_count, number) values
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'Ada', 5000, 99),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'Bisi', 0, 99);
insert into public.vote_packages (id, contest_id, votes, price_kobo) values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 10, 50000);
insert into public.ticket_types (id, event_id, name, kind, price_kobo, quantity, contest_id) values
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'Contestant entry', 'entry', 1000000, 20, '50000000-0000-0000-0000-000000000001');
select pg_temp.ok((select sum(votes_count) = 0 and array_agg(number order by number) = '{1,2}' from public.contestants), 'sellers cannot seed votes or pick numbers');

select pg_temp.as_anon();
select pg_temp.ok((select count(*) = 2 from public.contestants), 'leaderboard is public');

select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.fails($$select public.cast_free_vote('60000000-0000-0000-0000-000000000001')$$, 'free vote needs a verified phone');
select pg_temp.as_owner();
update auth.users set phone = '2348030000001', phone_confirmed_at = now() where id = pg_temp.id('buyer');
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.ok(public.cast_free_vote('60000000-0000-0000-0000-000000000001') = 1, 'verified buyer casts one free vote');
select pg_temp.fails($$select public.cast_free_vote('60000000-0000-0000-0000-000000000002')$$, 'only one free vote per contest');
update public.contestants set votes_count = 1000000;
select pg_temp.as_owner();
select pg_temp.ok((select max(votes_count) = 1 from public.contestants), 'nobody can edit vote counts directly');

select pg_temp.as_user(pg_temp.id('buyer')::text);
create temp table v1 as select public.create_vote_order('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 3) as r;
grant select on v1 to public;
select pg_temp.as_service();
select public.fulfil_order((select r ->> 'reference' from v1), (select (r ->> 'total_kobo')::bigint from v1), 'trx_votes');
select pg_temp.as_owner();
select pg_temp.ok((select votes_count = 30 from public.contestants where id = '60000000-0000-0000-0000-000000000002'), 'paid vote bundle adds 3 x 10 votes');

-- Buying an entry ticket registers a contestant.
select pg_temp.as_user(pg_temp.id('entrant')::text);
create temp table e1 as select public.create_order('20000000-0000-0000-0000-000000000001',
  '[{"ticket_type_id":"30000000-0000-0000-0000-000000000006","quantity":1}]', 'Queen Amaka', '', '{"tshirt":"S","bio":"Lagos girl, loves jollof","photo_url":"https://img.example/amaka.jpg"}') as r;
grant select on e1 to public;
select pg_temp.as_service();
select public.fulfil_order((select r ->> 'reference' from e1), (select (r ->> 'total_kobo')::bigint from e1), 'trx_entry');
select pg_temp.as_owner();
select pg_temp.ok((select number = 3 and bio = 'Lagos girl, loves jollof' and user_id = pg_temp.id('entrant')
  from public.contestants where display_name = 'Queen Amaka'), 'entry ticket creates contestant #3 with bio and photo');

-- 9. Aso-ebi collection ---------------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('seller')::text);
update public.order_items set collected = true where asoebi_item_id is not null;
select pg_temp.ok((select bool_and(collected) from public.order_items where asoebi_item_id is not null), 'seller marks aso-ebi collected');
select pg_temp.fails($$update public.order_items set quantity = 50 where asoebi_item_id is not null$$, 'seller cannot change what was bought');

-- 10. Sales summary --------------------------------------------------------------------------------
select pg_temp.ok(((public.event_sales('20000000-0000-0000-0000-000000000001') -> 'promoters' -> 0 ->> 'owed_kobo')::bigint) = 990000,
  'seller sees promoter commission owed');
select pg_temp.as_user(pg_temp.id('stranger')::text);
select pg_temp.fails($$select public.event_sales('20000000-0000-0000-0000-000000000001')$$, 'others cannot see sales');

-- 11. Postpone, refund, cancel ----------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('buyer')::text);
select pg_temp.fails($$select public.request_refund((select id from public.orders where reference = (select r ->> 'reference' from o2)))$$,
  'no self-service refund while the event is on');
select pg_temp.as_user(pg_temp.id('seller')::text);
select public.postpone_event('20000000-0000-0000-0000-000000000001', now() + interval '60 days', 'Hall flooded, new date soon');
select pg_temp.as_user(pg_temp.id('buyer')::text);
select public.request_refund((select id from public.orders where reference = (select r ->> 'reference' from o2)));
select pg_temp.ok((select status = 'refund_pending' from public.orders where reference = (select r ->> 'reference' from o2)), 'buyer requests refund after postponement');
select pg_temp.fails($$select public.request_refund((select id from public.orders where reference = (select r ->> 'reference' from o1)))$$,
  'no refund once a ticket in the order was used');
select pg_temp.as_owner();
select pg_temp.ok((select bool_and(t.status = 'void') from public.tickets t join public.orders o on o.id = t.order_id where o.reference = (select r ->> 'reference' from o2)),
  'refunded tickets are void');
select pg_temp.as_service();
select public.mark_refund((select id from public.refunds limit 1), true, 'rf_1', null);
select pg_temp.as_owner();
select pg_temp.ok((select status = 'refunded' from public.orders where reference = (select r ->> 'reference' from o2)), 'Paystack confirmation completes the refund');

select pg_temp.as_user(pg_temp.id('stranger')::text);
select pg_temp.fails($$select public.cancel_event('20000000-0000-0000-0000-000000000001', 'because')$$, 'others cannot cancel');
select pg_temp.as_user(pg_temp.id('seller')::text);
select pg_temp.ok(public.cancel_event('20000000-0000-0000-0000-000000000001', 'Venue withdrew') >= 2, 'cancelling queues refunds for every paid order');
select pg_temp.as_owner();
select pg_temp.ok((select count(*) = 0 from public.tickets where status = 'valid'), 'cancelled event has no valid tickets');
select pg_temp.ok((select count(*) = 0 from public.refunds r join public.orders o on o.id = r.order_id where o.total_kobo = 0), 'free and comp orders need no refund');

-- 12. Admin settings ---------------------------------------------------------------------------------
select pg_temp.as_user(pg_temp.id('seller')::text);
update public.platform_settings set commission_bps = 0;
select pg_temp.as_user(pg_temp.id('admin')::text);
update public.platform_settings set commission_bps = 700;
select pg_temp.as_owner();
select pg_temp.ok((select commission_bps = 700 from public.platform_settings), 'only admins change commission');

select pg_temp.as_owner();
\echo ALL MARKETPLACE TESTS PASSED
