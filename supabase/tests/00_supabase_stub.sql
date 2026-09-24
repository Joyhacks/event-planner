-- Minimal stand-in for the parts of Supabase the migrations depend on, so
-- they can be tested on plain Postgres. Never run this against Supabase.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema extensions;
create extension pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create publication supabase_realtime;

create schema auth;
create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  phone               text unique,
  phone_confirmed_at  timestamptz,
  raw_user_meta_data  jsonb not null default '{}'
);

create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
