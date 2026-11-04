-- Unpaid orders stop holding stock after their hold expires (held_units()
-- already ignores them). This job also marks them 'expired' so seller and
-- admin reports stay clean. A late Paystack payment for an expired order is
-- still fulfilled by fulfil_order() and flagged if stock ran out.

create function public.expire_stale_orders()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.orders
    set status = 'expired'
    where status = 'pending' and expires_at < now() - interval '5 minutes'
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke all on function public.expire_stale_orders() from public, anon, authenticated;
grant execute on function public.expire_stale_orders() to service_role;

-- Every 10 minutes, where pg_cron is available (it is on Supabase).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('ariya-expire-orders', '*/10 * * * *', 'select public.expire_stale_orders()');
  end if;
end;
$$;
