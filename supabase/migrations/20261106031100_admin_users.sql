-- Admins: the first account is an admin; admins can create further accounts (via the
-- `create-user` edge function). Public sign-up stays limited to that very first account.

alter table public.profiles add column is_admin boolean not null default false;

-- Backfill: whoever signed up first is the admin.
update public.profiles
set is_admin = true
where id = (select id from public.profiles order by created_at, id limit 1);

-- Users may edit their name and club, but never their own admin flag.
revoke update on public.profiles from authenticated;
grant update (name, club_id) on public.profiles to authenticated;

-- Profile creation: the first user, or anyone explicitly flagged by an admin, becomes admin.
-- raw_app_meta_data can only be set server-side (service role), unlike user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, club_id, is_admin)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'club_id',
    not exists (select 1 from public.profiles)
      or coalesce(new.raw_app_meta_data ->> 'make_admin', 'false') = 'true'
  );
  return new;
end;
$$;

-- Sign-up gate: open only for the very first account, or for accounts created by an admin
-- through the edge function (which sets app_metadata.created_by_admin with the service role).
create or replace function public.prevent_additional_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('single_account'));
  if exists (select 1 from auth.users)
     and coalesce(new.raw_app_meta_data ->> 'created_by_admin', 'false') <> 'true' then
    raise exception 'Sign-up is closed: ask an admin to create your account'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
