begin;
select plan(26);

-- Clean slate: the tests assume an empty database (the first user goes through the public
-- sign-up path). Everything runs in this transaction, which is rolled back at the end.
delete from public.campaign_games;
delete from public.campaigns;
delete from public.games;
delete from public.user_invites;
delete from auth.users;
delete from public.clubs;

-- Club A: first user via the public sign-up path.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data)
values (
  '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'admin@a.test',
  '{"name": "Admin A", "club_code": "club-a", "club_name": "Club A"}', '{}'
);
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
select id as club_a from public.clubs where code = 'club-a' \gset

-- Act as m1 (club A).
select set_config('request.jwt.claims', json_build_object('sub', :'m1', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok(
  $$insert into public.campaigns (id, title) values ('11111111-1111-1111-1111-111111111111', 'Season 1')$$,
  'member can create a campaign');

select lives_ok(
  $$insert into public.campaign_templates (id, campaign_id, type, position)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111111', 'intro', 1)$$,
  'member can create a template');
select is((select club_id from public.campaign_templates), :'club_a'::uuid,
  'template club_id defaults to the member club');
select throws_ok(
  $$insert into public.campaign_templates (campaign_id, type, position)
    values ('11111111-1111-1111-1111-111111111111', 'outro', 9)$$,
  '23514', null, 'type outside intro|focus|games is rejected');
select throws_ok(
  $$insert into public.campaign_templates (campaign_id, type, position, config)
    values ('11111111-1111-1111-1111-111111111111', 'focus', 9, '[1]'::jsonb)$$,
  '23514', null, 'config that is not a json object is rejected');
select throws_ok(
  $$insert into public.campaign_templates (campaign_id, type, position)
    values ('11111111-1111-1111-1111-111111111111', 'focus', 1)$$,
  '23505', null, '(campaign_id, position) is unique');

select lives_ok(
  $$insert into public.campaign_templates (id, campaign_id, type, position) values
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '11111111-1111-1111-1111-111111111111', 'focus', 2),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '11111111-1111-1111-1111-111111111111', 'games', 3)$$,
  'member can create more templates');

select lives_ok(
  $$update public.campaign_templates set position = 4, config = '{"a": 1}'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  'member can update position and config');
select is(
  (select position::text || ':' || config::text from public.campaign_templates
   where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  '4:{"a": 1}', 'position and config are updated');
select throws_ok(
  $$update public.campaign_templates set type = 'focus' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  '42501', null, 'member cannot update type');
select throws_ok(
  $$update public.campaign_templates set club_id = '00000000-0000-0000-0000-0000000000c2'
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  '42501', null, 'member cannot update club_id');
select lives_ok(
  $$update public.campaign_templates set position = 3 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'$$,
  'member restores the position');

-- Act as m2 (club B).
select set_config('request.jwt.claims', json_build_object('sub', :'m2', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.campaign_templates), 0, 'club B sees no club A templates');
select throws_ok(
  $$insert into public.campaign_templates (campaign_id, type, position)
    values ('11111111-1111-1111-1111-111111111111', 'focus', 10)$$,
  '23503', null, 'club B cannot insert a template for a club A campaign');
select lives_ok($$delete from public.campaign_templates$$, 'club B delete of club A templates is a no-op');
select throws_ok(
  $$select public.reorder_campaign_templates('11111111-1111-1111-1111-111111111111',
    array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2']::uuid[])$$,
  '22023', null, 'club B cannot reorder a club A campaign');

-- Back to m1 (club A).
select set_config('request.jwt.claims', json_build_object('sub', :'m1', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.campaign_templates), 3, 'club A templates survived club B delete');

select lives_ok(
  $$select public.reorder_campaign_templates('11111111-1111-1111-1111-111111111111',
    array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2']::uuid[])$$,
  'member can reorder templates');
select is(
  (select array_agg(id::text order by position) from public.campaign_templates),
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'],
  'reorder rewrites positions in the given order');
select is(
  (select array_agg(position order by position) from public.campaign_templates),
  array[1, 2, 3], 'positions are 1..n');

select throws_ok(
  $$select public.reorder_campaign_templates('11111111-1111-1111-1111-111111111111',
    array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2']::uuid[])$$,
  '22023', null, 'reorder raises when an id is missing');
select throws_ok(
  $$select public.reorder_campaign_templates('11111111-1111-1111-1111-111111111111',
    array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1']::uuid[])$$,
  '22023', null, 'reorder raises on a foreign id');
select throws_ok(
  $$select public.reorder_campaign_templates('11111111-1111-1111-1111-111111111111',
    array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2']::uuid[])$$,
  '22023', null, 'reorder raises on duplicate ids');
select is(
  (select array_agg(id::text order by position) from public.campaign_templates),
  array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'],
  'positions are unchanged after failed reorders');

select lives_ok($$delete from public.campaigns$$, 'member can delete a campaign');
select is((select count(*)::int from public.campaign_templates), 0, 'deleting the campaign deletes its templates');

select * from finish();
rollback;
