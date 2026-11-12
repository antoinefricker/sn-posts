-- A campaign is either active or closed. Existing campaigns stay active.

alter table public.campaigns
  add column status text not null default 'active' check (status in ('active', 'closed'));

-- Status is editable like the title.
grant update (title, status) on public.campaigns to authenticated;
