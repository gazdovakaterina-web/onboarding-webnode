-- Launchpad Hub — Supabase schema
-- Run this once in your project's SQL Editor (Supabase dashboard → SQL Editor → New query → paste → Run)

-- 1. Profiles table: one row per user, holds their role
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'editor')),
  created_at timestamptz default now()
);

-- Automatically create a profile (as 'viewer') whenever someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'viewer');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Topics table: the shared content of the hub (one row per card)
create table if not exists public.topics (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- 3. Progress table: per-user "completed" checkbox per topic
create table if not exists public.progress (
  user_id uuid references auth.users on delete cascade,
  topic_id text references public.topics(id) on delete cascade,
  completed boolean default false,
  updated_at timestamptz default now(),
  primary key (user_id, topic_id)
);

-- 4. Quiz scores: per-user latest score per topic
create table if not exists public.quiz_scores (
  user_id uuid references auth.users on delete cascade,
  topic_id text references public.topics(id) on delete cascade,
  correct int not null,
  total int not null,
  updated_at timestamptz default now(),
  primary key (user_id, topic_id)
);

-- ---------- Row Level Security ----------

alter table public.profiles enable row level security;
alter table public.topics enable row level security;
alter table public.progress enable row level security;
alter table public.quiz_scores enable row level security;

-- Profiles: everyone can read their own profile (needed to know their own role).
-- Role changes are NOT allowed from the client — promote people to 'editor'
-- manually in the Supabase dashboard (Table Editor → profiles). This prevents
-- someone from just editing their own role in the browser.
create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

-- Topics: any signed-in user can read. Only editors can write.
create policy "topics readable by signed-in users" on public.topics
  for select using (auth.role() = 'authenticated');

create policy "topics insertable by editors" on public.topics
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'editor')
  );

create policy "topics updatable by editors" on public.topics
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'editor')
  );

create policy "topics deletable by editors" on public.topics
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'editor')
  );

-- Progress: users can only read/write their own rows (any signed-in role).
create policy "manage own progress" on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Quiz scores: same as progress — own rows only.
create policy "manage own quiz scores" on public.quiz_scores
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
