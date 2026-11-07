begin;
select plan(57);

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
select is((select club_id from public.campaigns), :'club_a'::uuid, 'campaign club_id defaults to the member club');
select is((select created_by from public.campaigns), :'m1'::uuid, 'campaign created_by defaults to the member');
select is((select count(*)::int from public.campaign_games), 0, 'a campaign with no games is valid');
select throws_ok($$insert into public.campaigns (title) values ('   ')$$, '23514', null, 'blank campaign title rejected');
select throws_ok(
  $$insert into public.campaigns (title, created_by) values ('X', '00000000-0000-0000-0000-0000000000a1')$$,
  '42501', null, 'cannot create a campaign as someone else');

-- Games
select lives_ok(
  $$insert into public.games (id, code, team_name, opponent_name, game_date, kickoff_time)
    values ('22222222-2222-2222-2222-222222222222', ' ab12 ', 'U13', 'Rivals', '2026-12-01', '10:00')$$,
  'member can create a game');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values ('AB12', 'U13', 'Other', '2026-12-02', '10:00')$$,
  '23505', null, 'code unique per club, trimmed and case-insensitive');
select throws_ok(
  format($$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values (%L, 'U13', 'Other', '2026-12-02', '10:00')$$, E'\tab12\n'),
  '23505', null, 'code padded with tab/newline collides in the same club');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values ('  ', 'U13', 'Other', '2026-12-02', '10:00')$$,
  '23514', null, 'blank game code rejected');
select throws_ok(
  $$insert into public.games (code, opponent_name, game_date, kickoff_time)
    values ('NT1', 'Other', '2026-12-02', '10:00')$$,
  '23502', null, 'missing team_name rejected');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values ('NT2', '  ', 'Other', '2026-12-02', '10:00')$$,
  '23514', null, 'blank team_name rejected');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values ('NT3', 'U13', '  ', '2026-12-02', '10:00')$$,
  '23514', null, 'blank opponent_name rejected');
select lives_ok(
  $$insert into public.games (id, code, team_name, opponent_name, game_date, kickoff_time, score_ours, score_theirs)
    values ('33333333-3333-3333-3333-333333333333', 'ZZ1', 'U13', 'Other', '2026-12-02', '10:00', 0, 0)$$,
  'scores (0,0) accepted');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time, score_ours, score_theirs)
    values ('ZZ2', 'U13', 'Other', '2026-12-02', '10:00', 1, null)$$,
  '23514', null, 'scores (1,null) rejected');
select throws_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time, score_ours, score_theirs)
    values ('ZZ3', 'U13', 'Other', '2026-12-02', '10:00', -1, 0)$$,
  '23514', null, 'scores (-1,0) rejected');

-- Links and updated_at
select set_config('t.u0', (select updated_at::text from public.campaigns), true);
select pg_sleep(0.01);
select lives_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')$$,
  'member can link a game to a campaign');
select ok((select updated_at > current_setting('t.u0')::timestamptz from public.campaigns),
  'linking advances campaign updated_at');
select throws_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')$$,
  '23505', null, 'same pair cannot be linked twice');

select set_config('t.u1', (select updated_at::text from public.campaigns), true);
select pg_sleep(0.01);
select lives_ok($$update public.games set opponent_name = 'Rivals 2' where code = ' ab12 '$$, 'member can edit a game');
select ok((select updated_at > current_setting('t.u1')::timestamptz from public.campaigns),
  'editing a game advances linked campaign updated_at');

select set_config('t.u2', (select updated_at::text from public.campaigns), true);
select pg_sleep(0.01);
select lives_ok($$delete from public.campaign_games$$, 'member can unlink');
select ok((select updated_at > current_setting('t.u2')::timestamptz from public.campaigns),
  'unlinking advances campaign updated_at');

-- Protected columns
select throws_ok($$update public.campaigns set created_by = '00000000-0000-0000-0000-0000000000a1'$$,
  '42501', null, 'member cannot change campaign created_by');
select throws_ok($$update public.campaigns set club_id = '00000000-0000-0000-0000-0000000000c2'$$,
  '42501', null, 'member cannot change campaign club_id');
select throws_ok($$update public.games set club_id = '00000000-0000-0000-0000-0000000000c2'$$,
  '42501', null, 'member cannot change game club_id');

-- Club B user
select set_config('request.jwt.claims', json_build_object('sub', :'m2', 'role', 'authenticated')::text, true);

select is((select count(*)::int from public.campaigns) + (select count(*)::int from public.games), 0,
  'club B sees none of club A campaigns/games');
select throws_ok(
  format($$insert into public.campaigns (club_id, title) values (%L, 'x')$$, :'club_a'),
  '42501', null, 'club B cannot insert a campaign into club A');
select lives_ok($$update public.campaigns set title = 'hacked'$$, 'club B update of club A campaigns is a no-op');
select lives_ok($$delete from public.games where code <> 'AB12'$$, 'club B delete of club A games is a no-op');

-- Cross-club link: club B creates a game, club A campaign cannot be linked to it.
select lives_ok(
  $$insert into public.games (id, code, team_name, opponent_name, game_date, kickoff_time)
    values ('44444444-4444-4444-4444-444444444444', 'AB12', 'B1', 'Foes', '2026-12-03', '11:00')$$,
  'same code allowed in a different club');

select set_config('request.jwt.claims', json_build_object('sub', :'m1', 'role', 'authenticated')::text, true);
select is((select title from public.campaigns), 'Season 1', 'club A campaign unchanged by club B');
select is((select count(*)::int from public.games), 2, 'club A games still present after club B delete');
select throws_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444')$$,
  '23503', null, 'a link cannot pair a club A campaign with a club B game');

-- Cascades
select lives_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
    ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')$$,
  'relink two games');
select lives_ok($$delete from public.games where id = '33333333-3333-3333-3333-333333333333'$$, 'delete a game');
select is((select count(*)::int from public.campaign_games), 1, 'deleting a game removes its links');
select lives_ok($$delete from public.campaigns$$, 'delete a campaign');
select is((select count(*)::int from public.campaign_games), 0, 'deleting a campaign removes its links');
select is((select count(*)::int from public.games), 1, 'deleting a campaign keeps its games');

-- Extra isolation and uniqueness cases
select lives_ok(
  $$insert into public.games (code, team_name, opponent_name, game_date, kickoff_time)
    values ('ZZ9', 'U13', 'Other', '2026-12-05', '10:00')$$,
  'second club A game for collision test');
select throws_ok($$update public.games set code = 'ab12' where code = 'ZZ9'$$,
  '23505', null, 'updating a game code to collide in the same club is rejected');

select lives_ok(
  $$insert into public.campaigns (id, title) values ('55555555-5555-5555-5555-555555555555', 'Season 2')$$,
  'club A campaign for link isolation');
select lives_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222')$$,
  'club A link for isolation');

select set_config('request.jwt.claims', json_build_object('sub', :'m2', 'role', 'authenticated')::text, true);
select lives_ok($$delete from public.campaign_games$$, 'club B delete of club A links is a no-op');
select lives_ok($$insert into public.campaigns (id, title) values ('66666666-6666-6666-6666-666666666666', 'B campaign')$$,
  'club B creates a campaign');
select throws_ok(
  $$insert into public.campaign_games (campaign_id, game_id) values
    ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222')$$,
  '23503', null, 'a link cannot pair a club B campaign with a club A game');

select set_config('request.jwt.claims', json_build_object('sub', :'m1', 'role', 'authenticated')::text, true);
select is((select count(*)::int from public.campaign_games), 1, 'club A link survived club B delete');

select ok(not has_function_privilege('authenticated', 'public.set_updated_at()', 'execute'),
  'authenticated cannot execute set_updated_at');
select ok(not has_function_privilege('authenticated', 'public.touch_campaigns_of_game()', 'execute'),
  'authenticated cannot execute touch_campaigns_of_game');
select ok(not has_function_privilege('anon', 'public.touch_campaigns_of_game()', 'execute'),
  'anon cannot execute touch_campaigns_of_game');

-- Deleting a user keeps what they created (creator becomes unknown) and other members still see it.
reset role;
select count(*)::int as games_before from public.games where club_id = :'club_a' \gset
select count(*)::int as campaigns_before from public.campaigns where club_id = :'club_a' \gset
select lives_ok($$delete from auth.users where id = '$$ || :'m1' || $$'$$, 'deleting a user who created campaigns and games succeeds');
select is((select count(*)::int from public.campaigns where created_by is null and club_id = :'club_a'), :campaigns_before,
  'their campaigns remain with a null creator');
select is((select count(*)::int from public.games where created_by is null and club_id = :'club_a'), :games_before,
  'their games remain with a null creator');
select is((select count(*)::int from public.campaigns where club_id = :'club_a'), :campaigns_before, 'no club A campaign was deleted with the user');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
set local role authenticated;
select is((select count(*)::int from public.campaigns), :campaigns_before, 'another club A member still sees the campaigns');
select is((select count(*)::int from public.games), :games_before, 'another club A member still sees the games');

select * from finish();
rollback;
