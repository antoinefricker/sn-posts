-- Projects, games and project<->game links. Everything is scoped to a club by RLS;
-- composite foreign keys guarantee a link can never cross clubs.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  title text not null check (char_length(btrim(title)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, club_id)
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id() references public.clubs (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  code text not null check (char_length(btrim(code)) > 0),
  team_name text not null check (char_length(btrim(team_name)) > 0),
  opponent_name text not null check (char_length(btrim(opponent_name)) > 0),
  game_date date not null,
  kickoff_time time not null,
  location text,
  score_ours int,
  score_theirs int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, club_id),
  constraint games_scores_check check (
    (score_ours is null and score_theirs is null)
    or (score_ours is not null and score_theirs is not null and score_ours >= 0 and score_theirs >= 0)
  )
);

create unique index games_club_code_key on public.games (club_id, lower(btrim(code, E' \t\r\n')));

create table public.project_games (
  project_id uuid not null,
  game_id uuid not null,
  club_id uuid not null default public.current_club_id(),
  primary key (project_id, game_id),
  foreign key (project_id, club_id) references public.projects (id, club_id) on delete cascade,
  foreign key (game_id, club_id) references public.games (id, club_id) on delete cascade
);

create index projects_club_id_idx on public.projects (club_id);
create index games_club_id_idx on public.games (club_id);
create index project_games_game_id_idx on public.project_games (game_id);

-- Triggers
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create function public.touch_projects_of_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'games' then
    update public.projects set updated_at = clock_timestamp()
    where id in (select project_id from public.project_games where game_id = new.id);
  elsif tg_op = 'DELETE' then
    update public.projects set updated_at = clock_timestamp() where id = old.project_id;
  else
    update public.projects set updated_at = clock_timestamp() where id = new.project_id;
  end if;
  return null;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.touch_projects_of_game() from public, anon, authenticated;

create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger games_set_updated_at before update on public.games
  for each row execute function public.set_updated_at();
create trigger games_touch_projects after update on public.games
  for each row execute function public.touch_projects_of_game();
create trigger project_games_touch_projects_ins after insert on public.project_games
  for each row execute function public.touch_projects_of_game();
create trigger project_games_touch_projects_del after delete on public.project_games
  for each row execute function public.touch_projects_of_game();

-- Row level security
alter table public.projects enable row level security;
alter table public.games enable row level security;
alter table public.project_games enable row level security;

create policy "Members read club projects" on public.projects for select to authenticated
  using (club_id = (select public.current_club_id()));
create policy "Members create club projects" on public.projects for insert to authenticated
  with check (club_id = (select public.current_club_id()) and created_by = (select auth.uid()));
create policy "Members update club projects" on public.projects for update to authenticated
  using (club_id = (select public.current_club_id()))
  with check (club_id = (select public.current_club_id()));
create policy "Members delete club projects" on public.projects for delete to authenticated
  using (club_id = (select public.current_club_id()));

create policy "Members read club games" on public.games for select to authenticated
  using (club_id = (select public.current_club_id()));
create policy "Members create club games" on public.games for insert to authenticated
  with check (club_id = (select public.current_club_id()) and created_by = (select auth.uid()));
create policy "Members update club games" on public.games for update to authenticated
  using (club_id = (select public.current_club_id()))
  with check (club_id = (select public.current_club_id()));
create policy "Members delete club games" on public.games for delete to authenticated
  using (club_id = (select public.current_club_id()));

create policy "Members read club links" on public.project_games for select to authenticated
  using (club_id = (select public.current_club_id()));
create policy "Members create club links" on public.project_games for insert to authenticated
  with check (club_id = (select public.current_club_id()));
create policy "Members delete club links" on public.project_games for delete to authenticated
  using (club_id = (select public.current_club_id()));

-- Grants: club_id / created_by are never updatable by users.
revoke all on public.projects, public.games, public.project_games from anon, authenticated;
grant select, insert, delete on public.projects, public.games, public.project_games to authenticated;
grant update (title) on public.projects to authenticated;
grant update (code, team_name, opponent_name, game_date, kickoff_time, location, score_ours, score_theirs)
  on public.games to authenticated;
