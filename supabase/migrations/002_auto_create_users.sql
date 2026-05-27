-- Auto-create public.users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill existing auth users who don't have a public.users row
insert into public.users (id, email, name)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', au.email)
from auth.users au
left join public.users pu on au.id = pu.id
where pu.id is null
on conflict (id) do nothing;
