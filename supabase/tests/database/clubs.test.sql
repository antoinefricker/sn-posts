begin;
select plan(12);

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
  insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    jsonb_build_object('name', p_email),
    jsonb_build_object('created_by_admin', true, 'club_id', p_club, 'make_admin', p_admin));
  return v_id;
end $$;

select pg_temp.create_test_user('m1@a.test', (select id from public.clubs where code = 'club-a'), false) as m1 \gset
select pg_temp.create_test_user('m2@b.test', '00000000-0000-0000-0000-0000000000c2', false) as m2 \gset

select is((select club_id from public.profiles where id = :'m1'),
  (select id from public.clubs where code = 'club-a'), 'created user joins app-metadata club');
select ok(not (select is_admin from public.profiles where id = :'m1'), 'created user is not admin');

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

select * from finish();
rollback;
