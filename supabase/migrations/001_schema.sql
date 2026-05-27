-- Circuit Fix Hub Schema

-- USERS (extends Supabase auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  created_at timestamp with time zone default now()
);

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can insert own data"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

-- CIRCUIT REPORTS
create table if not exists public.circuit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  image_url text,
  prompt text,
  detected_issue text,
  solution text,
  explanation text,
  confidence integer,
  created_at timestamp with time zone default now()
);

alter table public.circuit_reports enable row level security;

create policy "Users can see own reports"
  on public.circuit_reports for select
  using (auth.uid() = user_id);

create policy "Users can insert own reports"
  on public.circuit_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reports"
  on public.circuit_reports for delete
  using (auth.uid() = user_id);

-- COMMUNITY POSTS
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  image_url text,
  created_at timestamp with time zone default now()
);

alter table public.community_posts enable row level security;

create policy "Anyone can read community posts"
  on public.community_posts for select
  using (true);

create policy "Authenticated users can insert"
  on public.community_posts for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update own posts"
  on public.community_posts for update
  using (auth.uid() = user_id);

create policy "Users can delete own posts"
  on public.community_posts for delete
  using (auth.uid() = user_id);

-- ERROR DATABASE
create table if not exists public.error_database (
  id uuid primary key default gen_random_uuid(),
  circuit_name text,
  symptoms text[],
  causes text[],
  solutions text[],
  difficulty text
);

alter table public.error_database enable row level security;

create policy "Anyone can read error database"
  on public.error_database for select
  using (true);

create policy "Authenticated users can insert"
  on public.error_database for insert
  with check (auth.role() = 'authenticated');

-- STORAGE BUCKETS
insert into storage.buckets (id, name, public) values
  ('circuit-images', 'circuit-images', true),
  ('reports', 'reports', true),
  ('community', 'community', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can read circuit-images"
  on storage.objects for select
  using (bucket_id = 'circuit-images');

create policy "Authenticated users can upload to circuit-images"
  on storage.objects for insert
  with check (
    bucket_id = 'circuit-images'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can read reports"
  on storage.objects for select
  using (bucket_id = 'reports');

create policy "Authenticated users can upload to reports"
  on storage.objects for insert
  with check (
    bucket_id = 'reports'
    and auth.role() = 'authenticated'
  );

create policy "Anyone can read community"
  on storage.objects for select
  using (bucket_id = 'community');

create policy "Authenticated users can upload to community"
  on storage.objects for insert
  with check (
    bucket_id = 'community'
    and auth.role() = 'authenticated'
  );
