create table if not exists public.trips (
  id text primary key,
  trip_name text not null default 'Untitled Trip',
  travelers text not null default '',
  budget numeric not null default 0,
  currency text not null default 'USD',
  share_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  category text not null,
  estimated numeric not null default 0,
  actual numeric not null default 0,
  notes text not null default '',
  link text not null default '',
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  title text not null,
  type text not null,
  destination text not null default '',
  url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  trip_date date,
  start_time time,
  title text not null,
  location text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.plan_options (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  name text not null,
  estimated numeric not null default 0,
  pros text not null default '',
  cons text not null default '',
  notes text not null default '',
  rank integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id text primary key,
  trip_id text not null references public.trips(id) on delete cascade,
  happened_at timestamptz not null default now(),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_id_idx on public.expenses(trip_id);
create index if not exists places_trip_id_idx on public.places(trip_id);
create index if not exists itinerary_items_trip_id_idx on public.itinerary_items(trip_id);
create index if not exists plan_options_trip_id_idx on public.plan_options(trip_id);
create index if not exists activity_log_trip_id_idx on public.activity_log(trip_id);

alter table public.trips enable row level security;
alter table public.expenses enable row level security;
alter table public.places enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.plan_options enable row level security;
alter table public.activity_log enable row level security;

drop policy if exists "Anyone with anon key can read trips" on public.trips;
drop policy if exists "Anyone with anon key can add trips" on public.trips;
drop policy if exists "Anyone with anon key can edit trips" on public.trips;
drop policy if exists "Anyone with anon key can delete trips" on public.trips;
drop policy if exists "Anyone with anon key can read expenses" on public.expenses;
drop policy if exists "Anyone with anon key can add expenses" on public.expenses;
drop policy if exists "Anyone with anon key can edit expenses" on public.expenses;
drop policy if exists "Anyone with anon key can delete expenses" on public.expenses;
drop policy if exists "Anyone with anon key can read places" on public.places;
drop policy if exists "Anyone with anon key can add places" on public.places;
drop policy if exists "Anyone with anon key can edit places" on public.places;
drop policy if exists "Anyone with anon key can delete places" on public.places;
drop policy if exists "Anyone with anon key can read itinerary" on public.itinerary_items;
drop policy if exists "Anyone with anon key can add itinerary" on public.itinerary_items;
drop policy if exists "Anyone with anon key can edit itinerary" on public.itinerary_items;
drop policy if exists "Anyone with anon key can delete itinerary" on public.itinerary_items;
drop policy if exists "Anyone with anon key can read plan options" on public.plan_options;
drop policy if exists "Anyone with anon key can add plan options" on public.plan_options;
drop policy if exists "Anyone with anon key can edit plan options" on public.plan_options;
drop policy if exists "Anyone with anon key can delete plan options" on public.plan_options;
drop policy if exists "Anyone with anon key can read activity log" on public.activity_log;
drop policy if exists "Anyone with anon key can add activity log" on public.activity_log;
drop policy if exists "Anyone with anon key can edit activity log" on public.activity_log;
drop policy if exists "Anyone with anon key can delete activity log" on public.activity_log;

drop policy if exists "Trip link can read trips" on public.trips;
drop policy if exists "Trip link can add trips" on public.trips;
drop policy if exists "Trip link can edit trips" on public.trips;
drop policy if exists "Trip link can delete trips" on public.trips;

drop policy if exists "Trip link can read expenses" on public.expenses;
drop policy if exists "Trip link can add expenses" on public.expenses;
drop policy if exists "Trip link can edit expenses" on public.expenses;
drop policy if exists "Trip link can delete expenses" on public.expenses;

drop policy if exists "Trip link can read places" on public.places;
drop policy if exists "Trip link can add places" on public.places;
drop policy if exists "Trip link can edit places" on public.places;
drop policy if exists "Trip link can delete places" on public.places;

drop policy if exists "Trip link can read itinerary" on public.itinerary_items;
drop policy if exists "Trip link can add itinerary" on public.itinerary_items;
drop policy if exists "Trip link can edit itinerary" on public.itinerary_items;
drop policy if exists "Trip link can delete itinerary" on public.itinerary_items;

drop policy if exists "Trip link can read plan options" on public.plan_options;
drop policy if exists "Trip link can add plan options" on public.plan_options;
drop policy if exists "Trip link can edit plan options" on public.plan_options;
drop policy if exists "Trip link can delete plan options" on public.plan_options;

drop policy if exists "Trip link can read activity log" on public.activity_log;
drop policy if exists "Trip link can add activity log" on public.activity_log;
drop policy if exists "Trip link can edit activity log" on public.activity_log;
drop policy if exists "Trip link can delete activity log" on public.activity_log;

create policy "Trip link can read trips" on public.trips
  for select to anon
  using (id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add trips" on public.trips
  for insert to anon
  with check (id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit trips" on public.trips
  for update to anon
  using (id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete trips" on public.trips
  for delete to anon
  using (id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can read expenses" on public.expenses
  for select to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add expenses" on public.expenses
  for insert to anon
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit expenses" on public.expenses
  for update to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete expenses" on public.expenses
  for delete to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can read places" on public.places
  for select to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add places" on public.places
  for insert to anon
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit places" on public.places
  for update to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete places" on public.places
  for delete to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can read itinerary" on public.itinerary_items
  for select to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add itinerary" on public.itinerary_items
  for insert to anon
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit itinerary" on public.itinerary_items
  for update to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete itinerary" on public.itinerary_items
  for delete to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can read plan options" on public.plan_options
  for select to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add plan options" on public.plan_options
  for insert to anon
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit plan options" on public.plan_options
  for update to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete plan options" on public.plan_options
  for delete to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can read activity log" on public.activity_log
  for select to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can add activity log" on public.activity_log
  for insert to anon
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can edit activity log" on public.activity_log
  for update to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'))
  with check (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));

create policy "Trip link can delete activity log" on public.activity_log
  for delete to anon
  using (trip_id = (current_setting('request.headers', true)::json ->> 'x-trip-id'));
