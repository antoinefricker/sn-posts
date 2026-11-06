-- Only one account may ever be created: reject any sign-up once a user exists.
-- Enforced in the database so it cannot be bypassed by calling the Auth API directly.
create function public.prevent_additional_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Serialize concurrent sign-ups so two requests cannot both pass the check.
  perform pg_advisory_xact_lock(hashtext('single_account'));
  if exists (select 1 from auth.users) then
    raise exception 'Sign-up is closed: an account already exists'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger before_auth_user_created
  before insert on auth.users
  for each row execute function public.prevent_additional_users();

-- Lets the (signed-out) client know whether to offer the sign-up form.
create function public.signup_open()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select not exists (select 1 from auth.users);
$$;

revoke all on function public.signup_open() from public;
grant execute on function public.signup_open() to anon, authenticated;
