-- Deleting a user (Supabase dashboard / auth.admin.deleteUser) cascades auth.users -> profiles.
-- Projects and games they created must survive that: the creator becomes unknown (null).
-- The insert policies still require created_by = auth.uid(); column grants are unchanged.

alter table public.projects alter column created_by drop not null;
alter table public.projects drop constraint projects_created_by_fkey;
alter table public.projects add constraint projects_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.games alter column created_by drop not null;
alter table public.games drop constraint games_created_by_fkey;
alter table public.games add constraint games_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;
