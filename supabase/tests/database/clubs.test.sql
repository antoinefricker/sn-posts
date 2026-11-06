begin;
select plan(19);

-- First user: goes through the public sign-up path (club_code / club_name user metadata).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'admin@a.test',
  '{"name": "Admin A", "club_code": "club-a", "club_name": "Club A"}', '{}'
);

select is((select count(*)::int from public.clubs where code = 'club-a' and name = 'Club A'), 1,
  'first sign-up creates the club with that code and name');
select ok((select is_admin from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'first user is admin');
select is(
  (select club_id from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  (select id from public.clubs where code = 'club-a'),
  'first user profile belongs to the new club');

-- A second club (created by service role) and users created by an admin.
insert into public.clubs (id, code, name) values ('00000000-0000-0000-0000-0000000000c2', 'club-b', 'Club B');

create function pg_temp.create_test_user(p_email text, p_club uuid, p_admin boolean)
returns uuid language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  insert into public.user_invites (email, club_id, make_admin) values (lower(p_email), p_club, p_admin);
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    jsonb_build_object('name', p_email), '{}');
  return v_id;
end $$;

select pg_temp.create_test_user('m1@a.test', (select id from public.clubs where code = 'club-a'), false) as m1 \gset
select pg_temp.create_test_user('m2@b.test', '00000000-0000-0000-0000-0000000000c2', false) as m2 \gset

select is((select club_id from public.profiles where id = :'m1'),
  (select id from public.clubs where code = 'club-a'), 'created user joins the invited club');
select ok(not (select is_admin from public.profiles where id = :'m1'), 'created user is not admin');

-- Closed sign-up: without an invite, inserting a user is rejected once a user exists.
select throws_ok(
  $$insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
    values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'stranger@a.test', '{"name": "S", "club_id": "00000000-0000-0000-0000-0000000000c2", "created_by_admin": true}',
      '{"created_by_admin": true}')$$,
  'P0001', 'Sign-up is closed: ask an admin to create your account', 'no invite: sign-up rejected');

-- With an invite (email matched case-insensitively): joins the invite's club, honors make_admin,
-- and the invite is consumed.
insert into public.user_invites (email, club_id, make_admin)
values ('invited@b.test', '00000000-0000-0000-0000-0000000000c2', true);
select lives_ok(
  $$insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
    values ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-000000000000', 'authenticated',
      'authenticated', 'Invited@B.test', '{"name": "Invited"}', '{}')$$,
  'invited sign-up succeeds');
select is((select club_id from public.profiles where id = '00000000-0000-0000-0000-0000000000b9'),
  '00000000-0000-0000-0000-0000000000c2'::uuid, 'invited user joins the invite club');
select ok((select is_admin from public.profiles where id = '00000000-0000-0000-0000-0000000000b9'),
  'invite make_admin is honored');
select is((select count(*)::int from public.user_invites where email = 'invited@b.test'), 0,
  'the invite is consumed');

-- Act as member m1.
select set_config('request.jwt.claims', json_build_object('sub', :'m1', 'role', 'authenticated')::text, true);
set local role authenticated;

select is((select count(*)::int from public.clubs), 1, 'member sees only one club');
select is((select code from public.clubs), 'club-a', 'member sees own club');
select is((select count(*)::int from public.profiles), 2, 'member sees only profiles of own club');
select is((select count(*)::int from public.profiles where club_id = '00000000-0000-0000-0000-0000000000c2'), 0,
  'member sees no profile of other club');

select lives_ok($$update public.profiles set name = 'New Name' where id = auth.uid()$$, 'member can update name');
select throws_ok($$update public.profiles set club_id = '00000000-0000-0000-0000-0000000000c2' where id = auth.uid()$$,
  '42501', null, 'member cannot change club_id');
select throws_ok($$update public.profiles set is_admin = true where id = auth.uid()$$,
  '42501', null, 'member cannot change is_admin');

select throws_ok($$select * from public.user_invites$$, '42501', null, 'members cannot read invites');
select throws_ok(
  $$insert into public.user_invites (email, club_id) values ('x@a.test', '00000000-0000-0000-0000-0000000000c2')$$,
  '42501', null, 'members cannot write invites');

select * from finish();
rollback;
