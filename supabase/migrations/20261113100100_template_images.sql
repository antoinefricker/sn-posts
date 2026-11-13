-- Private bucket for campaign template images. Object path: <club_id>/<uuid>-<filename>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('template-images', 'template-images', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Members only access objects under their own club folder. No update policy: re-upload instead.
create policy "Members read their club template images" on storage.objects
  for select to authenticated
  using (bucket_id = 'template-images'
    and (storage.foldername(name))[1] = (select public.current_club_id())::text);

create policy "Members upload their club template images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'template-images'
    and (storage.foldername(name))[1] = (select public.current_club_id())::text);

create policy "Members delete their club template images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'template-images'
    and (storage.foldername(name))[1] = (select public.current_club_id())::text);
