-- Plan3 customer report: schema, roles and row-level security.
--
-- Access model: a user can read anything only if they have a row in public.profiles, and can
-- write only if that row has role = 'editor'. Sign-ups are disabled in the dashboard; invited
-- users get a 'viewer' profile from the on_auth_user_created trigger. The anon role gets nothing.

-- ---------------------------------------------------------------------------------------------
-- Users and roles
-- ---------------------------------------------------------------------------------------------

create type public.user_role as enum ('viewer', 'editor');

create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

-- security definer so policies can call these without recursing through profiles' own RLS.
create function public.is_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = auth.uid()) $$;

create function public.is_editor() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where user_id = auth.uid() and role = 'editor') $$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------------------------
-- Customer data
-- ---------------------------------------------------------------------------------------------

create table public.airlines (
  id               text primary key check (id ~ '^[a-z0-9-]+$'),
  name             text not null,
  active           boolean not null default true,
  sort             integer not null default 0,
  snapshot         text not null default '',
  -- Free-form key/value sections, as in the old JSON files. Known keys live in lib/schema.ts.
  main_info        jsonb not null default '{}' check (jsonb_typeof(main_info) = 'object'),
  commercial_info  jsonb not null default '{}' check (jsonb_typeof(commercial_info) = 'object'),
  integration_info jsonb not null default '{}' check (jsonb_typeof(integration_info) = 'object'),
  feature_info     jsonb not null default '{}' check (jsonb_typeof(feature_info) = 'object'),
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null
);

create table public.monthly_usage (
  airline_id    text not null references public.airlines (id) on update cascade on delete cascade,
  month         date not null check (extract(day from month) = 1),
  credits_used  integer not null default 0,
  credits_added integer not null default 0,
  revenue       numeric(14, 2) not null default 0,
  twilio        numeric(14, 2) not null default 0,
  hotels        numeric(14, 2) not null default 0,
  updated_at    timestamptz not null default now(),
  updated_by    uuid references auth.users (id) on delete set null,
  primary key (airline_id, month)
);

create type public.sales_stage as enum
  ('Lead', 'Qualified Lead', 'Demo', 'Negotiation', 'Closed-Won', 'Closed-Lost');

create table public.sales_opportunities (
  id              bigint generated always as identity primary key,
  customer        text not null,
  stage           public.sales_stage not null default 'Lead',
  interest        text not null default '',
  potential_value numeric(14, 2) not null default 0,
  currency        text not null default 'USD',
  next_steps      text not null default '',
  sort            integer not null default 0,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references auth.users (id) on delete set null
);

create table public.kpi_monthly (
  airline_id       text not null references public.airlines (id) on update cascade on delete cascade,
  month            date not null check (extract(day from month) = 1),
  core             jsonb not null default '{}',
  financial        jsonb not null default '{}',
  product          jsonb not null default '{}',
  customer_success jsonb not null default '{}',
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users (id) on delete set null,
  primary key (airline_id, month)
);

create type public.forecast_category as enum ('fixed', 'contracted', 'forecasted');

-- One row per deal; the forecast chart sums monthly_amount over [start_month, end_month].
create table public.forecast_deals (
  id             bigint generated always as identity primary key,
  customer       text not null,
  category       public.forecast_category not null,
  probability    smallint not null default 100 check (probability between 0 and 100),
  start_month    date not null check (extract(day from start_month) = 1),
  end_month      date not null check (extract(day from end_month) = 1),
  monthly_amount numeric(14, 2) not null default 0,
  currency       text not null default 'USD',
  start_note     text not null default '',
  status         text not null default '',
  sort           integer not null default 0,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references auth.users (id) on delete set null,
  check (end_month >= start_month)
);

-- ---------------------------------------------------------------------------------------------
-- updated_at / updated_by and audit log
-- ---------------------------------------------------------------------------------------------

create function public.stamp_update() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end $$;

create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  action     text not null,
  row_key    jsonb not null,
  user_id    uuid,
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);

create index audit_log_at on public.audit_log (at desc);

-- TG_ARGV[0] is a comma-separated list of the table's primary key columns.
create function public.audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  key jsonb := '{}';
  col text;
begin
  foreach col in array string_to_array(TG_ARGV[0], ',') loop
    key := key || jsonb_build_object(col, rec -> col);
  end loop;
  insert into public.audit_log (table_name, action, row_key, user_id, before, after)
  values (
    TG_TABLE_NAME, TG_OP, key, auth.uid(),
    case when TG_OP <> 'INSERT' then to_jsonb(old) end,
    case when TG_OP <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end $$;

do $$
declare
  t record;
begin
  for t in select * from (values
    ('airlines', 'id'),
    ('monthly_usage', 'airline_id,month'),
    ('sales_opportunities', 'id'),
    ('kpi_monthly', 'airline_id,month'),
    ('forecast_deals', 'id')
  ) as v(name, pk) loop
    execute format(
      'create trigger stamp_update before update on public.%I for each row execute function public.stamp_update()',
      t.name);
    execute format(
      'create trigger audit after insert or update or delete on public.%I for each row execute function public.audit(%L)',
      t.name, t.pk);
  end loop;
end $$;

-- Role changes are audited too.
create trigger audit after insert or update or delete on public.profiles
  for each row execute function public.audit('user_id');

-- ---------------------------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['airlines', 'monthly_usage', 'sales_opportunities', 'kpi_monthly', 'forecast_deals'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('create policy "editors insert" on public.%I for insert to authenticated with check (public.is_editor())', t);
    execute format('create policy "editors update" on public.%I for update to authenticated using (public.is_editor()) with check (public.is_editor())', t);
    execute format('create policy "editors delete" on public.%I for delete to authenticated using (public.is_editor())', t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy "members read" on public.profiles for select to authenticated using (public.is_member());
create policy "editors update" on public.profiles for update to authenticated
  using (public.is_editor()) with check (public.is_editor());
create policy "editors delete" on public.profiles for delete to authenticated using (public.is_editor());
-- No insert policy: profiles are created only by the on_auth_user_created trigger.

-- Written only by the audit() trigger (security definer); members can read it.
alter table public.audit_log enable row level security;
create policy "members read" on public.audit_log for select to authenticated using (public.is_member());

-- Nothing is readable without logging in, even if a policy is added by mistake later.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;
grant execute on function public.is_member(), public.is_editor() to authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
