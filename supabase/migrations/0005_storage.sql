-- Private bucket for shared receipt files: {organization_id}/{booking_id}/receipt.pdf|png.
-- Members manage files under their organization's folder; passengers read
-- them only through signed URLs created by the app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-files', 'share-files', false, 10485760, array['application/pdf', 'image/png'])
on conflict (id) do nothing;

create policy "members manage their share files" on storage.objects
  for all to authenticated
  using (bucket_id = 'share-files' and public.is_member_of_text((storage.foldername(name))[1]))
  with check (bucket_id = 'share-files' and public.is_member_of_text((storage.foldername(name))[1]));
