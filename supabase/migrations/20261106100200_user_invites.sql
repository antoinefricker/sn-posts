-- Invites: how an admin's create-user call tells the database which club (and role) a new
-- account gets. GoTrue does not expose admin-supplied app_metadata to the auth.users insert
-- triggers, and user metadata is client-controlled, so the grant lives in this table, which
-- only the service role and security definer functions can touch.

create table public.user_invites (
  email text primary key check (email = lower(btrim(email))),
  club_id uuid not null references public.clubs (id) on delete cascade,
  make_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_invites enable row level security;
revoke all on public.user_invites from anon, authenticated;

-- Sign-up gate: open for the very first account, afterwards only for invited emails.
create or replace function public.prevent_additional_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('single_account'));
  if exists (select 1 from auth.users)
     and not exists (
       select 1 from public.user_invites where email = lower(btrim(new.email))
     ) then
    raise exception 'Sign-up is closed: ask an admin to create your account'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Profile creation. The very first user creates the club (user metadata club_code/club_name)
-- and becomes its admin. Later users take club and role from their invite, which is consumed.
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
    delete from public.user_invites
    where email = lower(btrim(new.email))
    returning club_id, make_admin into v_club_id, v_is_admin;
  end if;

  insert into public.profiles (id, name, club_id, is_admin)
  values (new.id, new.raw_user_meta_data ->> 'name', v_club_id, v_is_admin);
  return new;
end;
$$;
