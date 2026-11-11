-- Replace the free-text `location` of a game by a home / away flag.
-- Existing games keep their meaning: an empty location was a home game, any other value an away game.

alter table public.games add column is_home boolean not null default true;

update public.games set is_home = (location is null or btrim(location) = '');

alter table public.games drop column location;

-- Dropping a column removes its column privileges: grant update on the new set of columns.
revoke update on public.games from authenticated;
grant update (code, team_name, opponent_name, game_date, kickoff_time, is_home, score_ours, score_theirs)
  on public.games to authenticated;
