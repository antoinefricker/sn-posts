-- Ordered post templates (intro, focus, games) attached to a campaign.
-- Scoped to a club by RLS; the composite foreign key guarantees a template can never
-- point at a campaign of another club.

create table public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null default public.current_club_id(),
  campaign_id uuid not null,
  type text not null check (type in ('intro', 'focus', 'games')),
  position int not null,
  config jsonb not null default '{}' check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (campaign_id, club_id) references public.campaigns (id, club_id) on delete cascade,
  unique (campaign_id, position) deferrable initially immediate
);

create index campaign_templates_club_id_idx on public.campaign_templates (club_id);
create index campaign_templates_campaign_id_idx on public.campaign_templates (campaign_id);

create trigger campaign_templates_set_updated_at before update on public.campaign_templates
  for each row execute function public.set_updated_at();

-- Row level security
alter table public.campaign_templates enable row level security;

create policy "Members read club templates" on public.campaign_templates for select to authenticated
  using (club_id = (select public.current_club_id()));
create policy "Members create club templates" on public.campaign_templates for insert to authenticated
  with check (club_id = (select public.current_club_id()));
create policy "Members update club templates" on public.campaign_templates for update to authenticated
  using (club_id = (select public.current_club_id()))
  with check (club_id = (select public.current_club_id()));
create policy "Members delete club templates" on public.campaign_templates for delete to authenticated
  using (club_id = (select public.current_club_id()));

-- Grants: club_id, campaign_id and type are never updatable by users.
revoke all on public.campaign_templates from anon, authenticated;
grant select, insert, delete on public.campaign_templates to authenticated;
grant update (position, config) on public.campaign_templates to authenticated;

-- Rewrites the positions of a campaign's templates to 1..n following p_ids.
-- p_ids must be exactly the campaign's template ids, without duplicates.
create function public.reorder_campaign_templates(p_campaign_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(p_ids) as u(id) group by u.id having count(*) > 1
  ) or array(
    select t.id from public.campaign_templates t where t.campaign_id = p_campaign_id order by t.id
  ) is distinct from array(
    select u.id from unnest(p_ids) as u(id) order by u.id
  ) then
    raise exception 'p_ids must list each template of the campaign exactly once'
      using errcode = '22023';
  end if;

  set constraints all deferred;

  update public.campaign_templates t
  set position = o.ordinality::int
  from unnest(p_ids) with ordinality as o(id, ordinality)
  where t.id = o.id and t.campaign_id = p_campaign_id;
end;
$$;

revoke all on function public.reorder_campaign_templates(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_campaign_templates(uuid, uuid[]) to authenticated;
