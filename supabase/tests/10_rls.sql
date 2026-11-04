-- Security tests for Phase A. Every block must pass or the run aborts.
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ada@example.test', '{"full_name":"Ada Owner"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bola@example.test', '{"full_name":"Bola Editor"}'),
  ('00000000-0000-0000-0000-00000000000c', 'chidi@example.test', '{"full_name":"Chidi Stranger"}'),
  ('00000000-0000-0000-0000-00000000000d', 'dayo@example.test', '{"full_name":"Dayo Admin"}');

-- The project owner bootstraps the first super admin from the SQL editor.
update public.profiles set role = 'super_admin' where id = '00000000-0000-0000-0000-00000000000d';

create function pg_temp.as_user(u text) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAILED: %', what; end if;
  raise notice 'ok  %', what;
end $$;

-- 1. Signup creates a profile with role "user".
select pg_temp.expect(
  (select role = 'user' and full_name = 'Ada Owner' from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'signup trigger creates a user profile');

-- 2. A user cannot promote themselves.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin
    update public.profiles set role = 'super_admin' where id = auth.uid();
    raise exception 'FAILED: self-promotion was allowed';
  exception when insufficient_privilege then raise notice 'ok  self-promotion blocked';
  end;
end $$;
-- ...but can change their own name.
update public.profiles set full_name = 'Ada O.' where id = auth.uid();
select pg_temp.expect((select full_name = 'Ada O.' from public.profiles where id = auth.uid()), 'user edits own name');
-- ...and cannot see other profiles.
select pg_temp.expect((select count(*) = 1 from public.profiles), 'user sees only own profile');
commit;

-- 3. A super admin can see everyone and approve a seller.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect((select count(*) = 4 from public.profiles), 'admin sees all profiles');
update public.profiles set role = 'seller' where id = '00000000-0000-0000-0000-00000000000b';
commit;
select pg_temp.expect((select role = 'seller' from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'admin promotes user to seller');

-- 4. Ada creates an event (insert ... returning must work) and becomes owner.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
create temp table new_event on commit drop as
  with ins as (
    insert into public.planner_events (title, type, date, city)
    values ('Adaeze & Tobi', 'trad-wedding', '2026-11-08', 'Lagos') returning id
  ) select id from ins;
select set_config('test.event', (select id::text from new_event), false);
select pg_temp.expect(
  (select role = 'owner' from public.planner_members where event_id = current_setting('test.event')::uuid and user_id = auth.uid()),
  'creator becomes owner');
insert into public.planner_guests (event_id, name) values (current_setting('test.event')::uuid, 'Chief Okafor');
commit;

-- 5. Strangers see nothing and cannot write.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect((select count(*) = 0 from public.planner_events), 'stranger cannot see the event');
select pg_temp.expect((select count(*) = 0 from public.planner_guests), 'stranger cannot see guests');
do $$ begin
  begin
    insert into public.planner_guests (event_id, name) values (current_setting('test.event')::uuid, 'Gatecrasher');
    raise exception 'FAILED: stranger inserted a guest';
  exception when insufficient_privilege then raise notice 'ok  stranger cannot add guests';
  end;
end $$;
update public.planner_events set title = 'Hacked' where id = current_setting('test.event')::uuid;
do $$ begin
  begin
    perform public.invite_planner_member(current_setting('test.event')::uuid, 'chidi@example.test', 'editor');
    raise exception 'FAILED: stranger invited themselves';
  exception when insufficient_privilege then raise notice 'ok  stranger cannot invite';
  end;
end $$;
commit;
select pg_temp.expect((select title = 'Adaeze & Tobi' from public.planner_events), 'stranger update had no effect');

-- 6. Owner invites Bola as editor; Bola can work on the event but not delete it.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect(public.invite_planner_member(current_setting('test.event')::uuid, 'BOLA@example.test', 'editor'), 'owner invites by email (case-insensitive)');
select pg_temp.expect(not public.invite_planner_member(current_setting('test.event')::uuid, 'nobody@example.test'), 'unknown email returns false');
commit;

begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect((select count(*) = 1 from public.planner_events), 'editor sees the event');
insert into public.planner_guests (event_id, name, plus_ones) values (current_setting('test.event')::uuid, 'Aunty Funke', 2);
select pg_temp.expect((select count(*) = 2 from public.planner_guests), 'editor adds and reads guests');
delete from public.planner_events where id = current_setting('test.event')::uuid;
do $$ begin
  begin
    update public.planner_members set role = 'owner' where user_id = auth.uid();
    raise notice 'ok  editor role update silently filtered';
  exception when insufficient_privilege then raise notice 'ok  editor cannot make themselves owner';
  end;
end $$;
commit;
select pg_temp.expect((select count(*) = 1 from public.planner_events), 'editor could not delete the event');
select pg_temp.expect(
  (select role = 'editor' from public.planner_members where user_id = '00000000-0000-0000-0000-00000000000b'),
  'editor is still an editor');

-- 7. Viewers can read but not write.
update public.planner_members set role = 'viewer' where user_id = '00000000-0000-0000-0000-00000000000b';
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    insert into public.planner_guests (event_id, name) values (current_setting('test.event')::uuid, 'Viewer add');
    raise exception 'FAILED: viewer inserted a guest';
  exception when insufficient_privilege then raise notice 'ok  viewer cannot add guests';
  end;
end $$;
commit;

-- 8. Anonymous visitors see nothing.
begin;
select set_config('role', 'anon', true);
select pg_temp.expect((select count(*) = 0 from public.planner_events), 'anon sees no events');
select pg_temp.expect((select count(*) = 0 from public.profiles), 'anon sees no profiles');
commit;

-- 9. The creator column cannot be reassigned.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin
    update public.planner_events set created_by = '00000000-0000-0000-0000-00000000000c';
    raise exception 'FAILED: creator reassigned';
  exception when insufficient_privilege then raise notice 'ok  creator cannot be reassigned';
  end;
end $$;
commit;

-- 10. Deleting the event removes everything under it.
begin;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
delete from public.planner_events where id = current_setting('test.event')::uuid;
commit;
select pg_temp.expect((select count(*) = 0 from public.planner_guests), 'owner delete cascades to guests');

\echo ALL RLS TESTS PASSED
