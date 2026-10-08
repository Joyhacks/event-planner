-- Atomic shared-planner snapshots over the existing RLS-protected tables.
-- All RPCs are SECURITY INVOKER. Membership policies remain the authority.
alter table public.planner_events add column revision bigint not null default 1;
alter table public.planner_event_vendors add column custom jsonb;
alter table public.planner_event_vendors add constraint valid_custom_vendor check (
  custom is null or (
    jsonb_typeof(custom) = 'object' and custom ?& array['name','category','phone','notes','quote']
    and jsonb_typeof(custom->'name') = 'string' and jsonb_typeof(custom->'category') = 'string'
    and jsonb_typeof(custom->'phone') = 'string' and jsonb_typeof(custom->'notes') = 'string'
    and jsonb_typeof(custom->'quote') = 'number'
    and char_length(custom->>'name') between 1 and 120
    and custom->>'category' in ('catering','decor','venue','entertainment','media','attire','small-chops','mc')
    and char_length(custom->>'phone') <= 30 and char_length(custom->>'notes') <= 1000
    and (custom->>'quote')::numeric between 0 and 1000000000000
    and (custom->>'quote')::numeric = trunc((custom->>'quote')::numeric)
  )
);
alter table public.planner_asoebi_buyers
  add column amount_paid bigint not null default 0 check (amount_paid between 0 and 1000000000000),
  add column payment_date date,
  add column notes text not null default '' check (char_length(notes) <= 1000);
update public.planner_asoebi_buyers b set amount_paid = b.sets * a.price_per_set
from public.planner_asoebi a where a.event_id = b.event_id and b.paid;

create function public.planner_bump_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  return new;
end $$;
create trigger planner_revision before update on public.planner_events
for each row execute function public.planner_bump_revision();

-- Direct child-table changes also invalidate a stale snapshot, including old clients.
create function public.planner_child_changed() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP <> 'DELETE' then
    update public.planner_events set updated_at = now() where id = new.event_id;
  end if;
  if TG_OP = 'DELETE' or (TG_OP = 'UPDATE' and old.event_id is distinct from new.event_id) then
    update public.planner_events set updated_at = now() where id = old.event_id;
  end if;
  return null;
end $$;
revoke all on function public.planner_child_changed() from public, anon, authenticated;
do $$ declare t text; begin
  foreach t in array array['planner_guests','planner_budget_items','planner_event_vendors','planner_schedule_items','planner_asoebi','planner_asoebi_buyers'] loop
    execute format('create trigger planner_child_revision after insert or update or delete on public.%I for each row execute function public.planner_child_changed()', t);
  end loop;
end $$;

create function public.planner_snapshot(target_event uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
select jsonb_build_object(
  'revision', e.revision, 'role', public.planner_role(e.id),
  'event', jsonb_build_object(
    'id', e.id, 'title', e.title, 'type', e.type, 'date', e.date,
    'startTime', to_char(e.start_time, 'HH24:MI'), 'venue', e.venue, 'city', e.city,
    'currency', e.currency, 'budget', e.budget, 'guestTarget', e.guest_target,
    'hosts', e.hosts, 'createdAt', e.created_at,
    'guests', coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'phone',g.phone,'group',g."group",'rsvp',g.rsvp,'plusOnes',g.plus_ones) order by g.created_at,g.id) from public.planner_guests g where g.event_id=e.id),'[]'::jsonb),
    'budgetItems', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'category',b.category,'label',b.label,'planned',b.planned,'paid',b.paid) order by b.created_at,b.id) from public.planner_budget_items b where b.event_id=e.id),'[]'::jsonb),
    'vendors', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('vendorId',v.vendor_id,'status',v.status,'custom',v.custom)) order by v.created_at,v.vendor_id) from public.planner_event_vendors v where v.event_id=e.id),'[]'::jsonb),
    'schedule', coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'time',to_char(s.time,'HH24:MI'),'title',s.title,'owner',s.owner) order by s.time,s.id) from public.planner_schedule_items s where s.event_id=e.id),'[]'::jsonb),
    'asoebi', (select jsonb_build_object('fabric',a.fabric,'pricePerSet',a.price_per_set,'colors',a.colors,'payTo',a.pay_to,
      'buyers',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'sets',b.sets,'paid',b.amount_paid >= b.sets*a.price_per_set,'collected',b.collected,'amountPaid',b.amount_paid,'paymentDate',coalesce(b.payment_date::text,''),'notes',b.notes) order by b.created_at,b.id) from public.planner_asoebi_buyers b where b.event_id=e.id),'[]'::jsonb)) from public.planner_asoebi a where a.event_id=e.id)
  )
) from public.planner_events e where e.id=target_event;
$$;

create function public.list_planner_snapshots() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(public.planner_snapshot(id) order by created_at), '[]'::jsonb) from public.planner_events;
$$;

create function public.save_planner_snapshot(payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  v_event_id uuid := (payload->>'id')::uuid;
  current_revision bigint;
  a jsonb := payload->'asoebi';
  k text;
begin
  if auth.uid() is null then raise exception 'Sign in to save your event' using errcode='42501'; end if;
  if payload is null or v_event_id is null or expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid planner request' using errcode='22023';
  end if;
  if octet_length(payload::text) > 5000000 then raise exception 'Event is too large' using errcode='22023'; end if;
  foreach k in array array['guests','budgetItems','vendors','schedule'] loop
    if jsonb_typeof(payload->k) is distinct from 'array' or jsonb_array_length(payload->k) > (case k when 'guests' then 5000 when 'vendors' then 500 else 1000 end) then
      raise exception 'Invalid planner list' using errcode='22023';
    end if;
  end loop;
  if a is null or jsonb_typeof(a) not in ('object','null') then raise exception 'Invalid aso-ebi' using errcode='22023'; end if;
  if jsonb_typeof(a)='object' and (jsonb_typeof(a->'buyers') is distinct from 'array' or jsonb_array_length(a->'buyers')>5000) then
    raise exception 'Invalid buyer list' using errcode='22023';
  end if;
  select revision into current_revision from public.planner_events where id=v_event_id for update;
  if found then
    if not public.can_edit_planner_event(v_event_id) then raise exception 'This event is read only' using errcode='42501'; end if;
    if current_revision <> expected_revision then raise exception 'Another person changed this event. Load their version before saving.' using errcode='40001'; end if;
    update public.planner_events set
      title=payload->>'title', type=payload->>'type', date=(payload->>'date')::date,
      start_time=(payload->>'startTime')::time, venue=payload->>'venue', city=payload->>'city',
      currency=payload->>'currency', budget=(payload->>'budget')::bigint,
      guest_target=(payload->>'guestTarget')::integer, hosts=payload->>'hosts'
    where id=v_event_id;
  else
    if expected_revision <> 0 then raise exception 'Event is unavailable or access was removed' using errcode='42501'; end if;
    insert into public.planner_events(id,title,type,date,start_time,venue,city,currency,budget,guest_target,hosts)
    values(v_event_id,payload->>'title',payload->>'type',(payload->>'date')::date,(payload->>'startTime')::time,
      payload->>'venue',payload->>'city',payload->>'currency',(payload->>'budget')::bigint,(payload->>'guestTarget')::integer,payload->>'hosts');
  end if;
  -- The event lock above serialises all saves; every replacement is in this transaction.
  delete from public.planner_guests where planner_guests.event_id=v_event_id;
  insert into public.planner_guests(id,event_id,name,phone,"group",rsvp,plus_ones)
    select (g->>'id')::uuid,v_event_id,g->>'name',g->>'phone',g->>'group',g->>'rsvp',(g->>'plusOnes')::integer from jsonb_array_elements(payload->'guests') g;
  delete from public.planner_budget_items where planner_budget_items.event_id=v_event_id;
  insert into public.planner_budget_items(id,event_id,category,label,planned,paid)
    select (b->>'id')::uuid,v_event_id,b->>'category',b->>'label',(b->>'planned')::bigint,(b->>'paid')::bigint from jsonb_array_elements(payload->'budgetItems') b;
  delete from public.planner_event_vendors where planner_event_vendors.event_id=v_event_id;
  insert into public.planner_event_vendors(event_id,vendor_id,status,custom)
    select v_event_id,v->>'vendorId',v->>'status',nullif(v->'custom','null'::jsonb) from jsonb_array_elements(payload->'vendors') v;
  delete from public.planner_schedule_items where planner_schedule_items.event_id=v_event_id;
  insert into public.planner_schedule_items(id,event_id,time,title,owner)
    select (s->>'id')::uuid,v_event_id,(s->>'time')::time,s->>'title',s->>'owner' from jsonb_array_elements(payload->'schedule') s;
  delete from public.planner_asoebi where planner_asoebi.event_id=v_event_id;
  if jsonb_typeof(a)='object' then
    insert into public.planner_asoebi(event_id,fabric,price_per_set,colors,pay_to)
      values(v_event_id,a->>'fabric',(a->>'pricePerSet')::bigint,array(select jsonb_array_elements_text(a->'colors')),a->>'payTo');
    insert into public.planner_asoebi_buyers(id,event_id,name,sets,paid,collected,amount_paid,payment_date,notes)
      select (b->>'id')::uuid,v_event_id,b->>'name',(b->>'sets')::integer,
        (b->>'amountPaid')::bigint >= (b->>'sets')::integer*(a->>'pricePerSet')::bigint,
        (b->>'collected')::boolean,(b->>'amountPaid')::bigint,nullif(b->>'paymentDate','')::date,coalesce(b->>'notes','')
      from jsonb_array_elements(a->'buyers') b;
  end if;
  return (select revision from public.planner_events where id=v_event_id);
end $$;

create function public.delete_planner_snapshot(target_event uuid, expected_revision bigint)
returns void language plpgsql security invoker set search_path = '' as $$
declare v bigint;
begin
  if public.planner_role(target_event) is distinct from 'owner' then raise exception 'Only the owner can delete this event' using errcode='42501'; end if;
  select revision into v from public.planner_events where id=target_event for update;
  if v is distinct from expected_revision then raise exception 'Event changed. Refresh before deleting.' using errcode='40001'; end if;
  delete from public.planner_events where id=target_event;
end $$;

-- Names for the committee list, without exposing unrelated profiles or emails.
create function public.planner_committee(target_event uuid)
returns table(user_id uuid, full_name text, role public.planner_member_role)
language sql stable security definer set search_path='' as $$
  select m.user_id,p.full_name,m.role from public.planner_members m
  join public.profiles p on p.id=m.user_id
  where m.event_id=target_event and public.can_view_planner_event(target_event);
$$;

revoke all on function public.planner_snapshot(uuid), public.list_planner_snapshots(), public.save_planner_snapshot(jsonb,bigint), public.delete_planner_snapshot(uuid,bigint), public.planner_committee(uuid) from public,anon;
grant execute on function public.planner_snapshot(uuid), public.list_planner_snapshots(), public.save_planner_snapshot(jsonb,bigint), public.delete_planner_snapshot(uuid,bigint), public.planner_committee(uuid) to authenticated;
