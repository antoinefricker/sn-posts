-- Invites are short-lived: they only need to survive the create-user call. An expired invite
-- behaves as no invite, so a leftover row can never open sign-up or grant a club/admin flag.

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
       select 1 from public.user_invites
       where email = lower(btrim(new.email))
         and created_at > now() - interval '1 minute'
     ) then
    raise exception 'Sign-up is closed: ask an admin to create your account'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

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
      and created_at > now() - interval '1 minute'
    returning club_id, make_admin into v_club_id, v_is_admin;
  end if;

  insert into public.profiles (id, name, club_id, is_admin)
  values (new.id, new.raw_user_meta_data ->> 'name', v_club_id, v_is_admin);
  return new;
end;
$$;
