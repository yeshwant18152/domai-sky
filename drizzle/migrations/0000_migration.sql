create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Dispatcher',
  avatar text not null default 'plane',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  airport text not null,
  start_min int not null,
  duration_min int not null,
  recovery jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  saved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.scenarios to authenticated;
grant all on public.scenarios to service_role;
alter table public.scenarios enable row level security;
create policy "own scen select" on public.scenarios for select to authenticated using (auth.uid() = user_id);
create policy "own scen insert" on public.scenarios for insert to authenticated with check (auth.uid() = user_id);
create policy "own scen update" on public.scenarios for update to authenticated using (auth.uid() = user_id);
create policy "own scen delete" on public.scenarios for delete to authenticated using (auth.uid() = user_id);
create index on public.scenarios(user_id, created_at desc);