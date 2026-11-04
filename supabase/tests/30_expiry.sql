\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok  %', what;
end $$;

-- Reuse the seller/event from the marketplace tests: create two fresh orders.
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e9', 'late@ariya.test');
insert into public.orders (reference, buyer_id, event_id, kind, subtotal_kobo, total_kobo, fee_bearer, buyer_name, buyer_email, expires_at)
values
  ('ARY-OLD', '00000000-0000-0000-0000-0000000000e9', '20000000-0000-0000-0000-000000000001', 'purchase', 100, 100, 'seller', 'Late', 'late@ariya.test', now() - interval '1 hour'),
  ('ARY-NEW', '00000000-0000-0000-0000-0000000000e9', '20000000-0000-0000-0000-000000000001', 'purchase', 100, 100, 'seller', 'Soon', 'late@ariya.test', now() + interval '10 minutes');

select pg_temp.ok(public.expire_stale_orders() = 1, 'only holds past their expiry are expired');
select pg_temp.ok((select status = 'expired' from public.orders where reference = 'ARY-OLD'), 'stale order marked expired');
select pg_temp.ok((select status = 'pending' from public.orders where reference = 'ARY-NEW'), 'live hold left alone');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e9","role":"authenticated"}', false);
do $$ begin
  begin
    perform public.expire_stale_orders();
    raise exception 'FAILED: browser could run the expiry job';
  exception when insufficient_privilege then raise notice 'ok  browsers cannot run the expiry job';
  end;
end $$;
reset role;

\echo ALL EXPIRY TESTS PASSED
