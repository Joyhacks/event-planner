\set ON_ERROR_STOP on
-- Behaviour and authorization checks against the real snapshot RPCs.
create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.expect_failure(statement text, code text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate <> code then raise exception 'Expected %, got %: %',code,sqlstate,sqlerrm; end if;
    return;
  end;
  raise exception 'Statement unexpectedly succeeded: %',statement;
end $$;
insert into auth.users(id,email,raw_user_meta_data) values
('41000000-0000-0000-0000-000000000001','sync-owner@ariya.test','{"full_name":"Owner"}'),
('41000000-0000-0000-0000-000000000002','sync-editor@ariya.test','{"full_name":"Editor"}'),
('41000000-0000-0000-0000-000000000003','sync-viewer@ariya.test','{"full_name":"Viewer"}'),
('41000000-0000-0000-0000-000000000004','sync-stranger@ariya.test','{"full_name":"Stranger"}');

create function pg_temp.payload() returns jsonb language sql as $$ select '{
 "id":"42000000-0000-0000-0000-000000000001","title":"Our party","type":"owambe","date":"2027-01-02","startTime":"12:00","venue":"Hall","city":"Lagos","currency":"NGN","budget":500000,"guestTarget":100,"hosts":"Host",
 "guests":[{"id":"43000000-0000-0000-0000-000000000001","name":"Guest","phone":"08000000000","group":"family","rsvp":"maybe","plusOnes":2}],
 "budgetItems":[{"id":"44000000-0000-0000-0000-000000000001","label":"Food","category":"catering","planned":200000,"paid":50000}],
 "vendors":[{"vendorId":"custom-caterer","status":"deposit","custom":{"name":"My caterer","category":"catering","phone":"08000000000","quote":200000,"notes":"Vegetarian option"}}],
 "schedule":[{"id":"45000000-0000-0000-0000-000000000001","time":"12:30","title":"Welcome","owner":"MC"}],
 "asoebi":{"fabric":"Indigo","pricePerSet":10000,"colors":["#112233"],"payTo":"Bank details","buyers":[{"id":"46000000-0000-0000-0000-000000000001","name":"Buyer","sets":2,"amountPaid":5000,"paymentDate":"2026-10-08","notes":"Deposit","collected":false}]}
}'::jsonb $$;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001"}',false);
select public.save_planner_snapshot(pg_temp.payload(),0);
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001')->>'role'='owner','creator owns uploaded event');
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001')#>>'{event,asoebi,buyers,0,amountPaid}'='5000','partial payment survives round trip');
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001')#>>'{event,vendors,0,custom,name}'='My caterer','custom vendor survives round trip');
select pg_temp.ok(public.invite_planner_member('42000000-0000-0000-0000-000000000001','sync-editor@ariya.test','editor'),'owner adds editor');
select pg_temp.ok(public.invite_planner_member('42000000-0000-0000-0000-000000000001','sync-viewer@ariya.test','viewer'),'owner adds viewer');

-- Updating a child outside the snapshot API must invalidate stale clients too.
select set_config('test.old_revision',(select revision::text from public.planner_events where id='42000000-0000-0000-0000-000000000001'),false);
update public.planner_guests set name='Updated guest' where id='43000000-0000-0000-0000-000000000001';
select pg_temp.ok((select revision>current_setting('test.old_revision')::bigint from public.planner_events where id='42000000-0000-0000-0000-000000000001'),'direct child update changes revision');
select pg_temp.expect_failure('select public.save_planner_snapshot(pg_temp.payload(),current_setting(''test.old_revision'')::bigint)','40001');

-- A late invalid record rolls back replacement of all previous children and the parent.
select pg_temp.expect_failure($s$select public.save_planner_snapshot(jsonb_set(pg_temp.payload(),'{asoebi,buyers,0,sets}','0'),(select revision from public.planner_events where id='42000000-0000-0000-0000-000000000001'))$s$,'23514');
select pg_temp.ok((select name='Updated guest' from public.planner_guests where id='43000000-0000-0000-0000-000000000001'),'failed save does not erase previous guests');
select pg_temp.expect_failure($s$select public.save_planner_snapshot(jsonb_set(pg_temp.payload(),'{vendors,0,custom}','{}'),(select revision from public.planner_events where id='42000000-0000-0000-0000-000000000001'))$s$,'23514');

select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000002"}',false);
select public.save_planner_snapshot(jsonb_set(pg_temp.payload(),'{title}','"Editor saved"'),(select revision from public.planner_events where id='42000000-0000-0000-0000-000000000001'));
select pg_temp.expect_failure('select public.delete_planner_snapshot(''42000000-0000-0000-0000-000000000001'',1)','42501');
select pg_temp.expect_failure('select public.invite_planner_member(''42000000-0000-0000-0000-000000000001'',''sync-stranger@ariya.test'',''editor'')','42501');

select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000003"}',false);
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001')#>>'{event,title}'='Editor saved','viewer sees editor changes');
select pg_temp.expect_failure('select public.save_planner_snapshot(pg_temp.payload(),1)','42501');
select pg_temp.ok((select count(*)=3 from public.planner_committee('42000000-0000-0000-0000-000000000001')),'member sees committee names');

select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000004"}',false);
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001') is null,'outsider cannot read event');
select pg_temp.ok((select count(*)=0 from public.planner_committee('42000000-0000-0000-0000-000000000001')),'outsider cannot read committee');
select pg_temp.ok(public.list_planner_snapshots()='[]'::jsonb,'outsider cannot list shared plans');
select pg_temp.expect_failure('select public.save_planner_snapshot(pg_temp.payload(),1)','42501');

select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001"}',false);
delete from public.planner_members where event_id='42000000-0000-0000-0000-000000000001' and user_id='41000000-0000-0000-0000-000000000002';
select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000002"}',false);
select pg_temp.expect_failure('select public.save_planner_snapshot(pg_temp.payload(),1)','42501');
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001') is null,'revocation removes read access');

select set_config('request.jwt.claims','{"sub":"41000000-0000-0000-0000-000000000001"}',false);
select pg_temp.expect_failure('select public.delete_planner_snapshot(''42000000-0000-0000-0000-000000000001'',1)','40001');
select public.delete_planner_snapshot('42000000-0000-0000-0000-000000000001',(select revision from public.planner_events where id='42000000-0000-0000-0000-000000000001'));
select pg_temp.ok(public.planner_snapshot('42000000-0000-0000-0000-000000000001') is null,'owner can delete current version');
set role anon;
select pg_temp.expect_failure('select public.list_planner_snapshots()','42501');
reset role;
\echo ALL PLANNER SYNC TESTS PASSED
