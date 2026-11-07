-- Clubs: every user belongs to exactly one club (the schema does not prevent more later).
-- Admin is per club. Text club ids on profiles become references to club records.

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(btrim(code)) > 0),
  name text not null check (char_length(btrim(name)) > 0),
  created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

-- Backfill one club per distinct existing club id (code = name = that value).
insert into public.clubs (code, name)
select distinct btrim(club_id), btrim(club_id) from public.profiles;

alter table public.profiles add column club_uuid uuid references public.clubs (id);

update public.profiles p
set club_uuid = c.id
from public.clubs c
where c.code = btrim(p.club_id);

alter table public.profiles alter column club_uuid set not null;
alter table public.profiles drop column club_id;
alter table public.profiles rename column club_uuid to club_id;

create index profiles_club_id_idx on public.profiles (club_id);

-- Helpers reading the caller's profile (security definer so RLS policies can use them
-- without recursing into profiles' own policies).
create function public.current_club_id()
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select club_id from public.profiles where id = (select auth.uid());
$$;

create function public.is_club_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((select is_admin from public.profiles where id = (select auth.uid())), false);
$$;

revoke all on function public.current_club_id() from public;
revoke all on function public.is_club_admin() from public;
grant execute on function public.current_club_id() to authenticated;
grant execute on function public.is_club_admin() to authenticated;

-- Members read their own club only.
create policy "Members can read their club"
  on public.clubs for select
  to authenticated
  using (id = (select public.current_club_id()));

-- Profiles: readable by members of the same club.
drop policy "Users can read their own profile" on public.profiles;
create policy "Members can read profiles of their club"
  on public.profiles for select
  to authenticated
  using (club_id = (select public.current_club_id()));

-- Users may edit their name only: never their club or admin flag.
revoke update on public.profiles from authenticated;
grant update (name) on public.profiles to authenticated;

-- Profile creation. The very first user creates the club (user metadata club_code/club_name)
-- and becomes its admin. Later users are created by an admin through the edge function, which
-- sets app metadata club_id (and optionally make_admin) with the service role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_club_id uuid;
  v_is_admin boolean;
begin
  if not exists (select 1 from public.profiles) then
    insert into public.clubs (code, name)
    values (
      btrim(new.raw_user_meta_data ->> 'club_code'),
      btrim(new.raw_user_meta_data ->> 'club_name')
    )
    returning id into v_club_id;
    v_is_admin := true;
  else
    v_club_id := (new.raw_app_meta_data ->> 'club_id')::uuid;
    v_is_admin := coalesce(new.raw_app_meta_data ->> 'make_admin', 'false') = 'true';
  end if;

  insert into public.profiles (id, name, club_id, is_admin)
  values (new.id, new.raw_user_meta_data ->> 'name', v_club_id, v_is_admin);
  return new;
end;
$$;
