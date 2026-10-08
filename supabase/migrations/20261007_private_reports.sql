-- Review existing storage policies before applying; remove any broad anonymous/authenticated policies.
update storage.buckets set public = false where id = 'medical_reports';
create policy "Owner report upload" on storage.objects for insert to authenticated
with check (bucket_id = 'medical_reports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Owner report read" on storage.objects for select to authenticated
using (bucket_id = 'medical_reports' and ((storage.foldername(name))[1] = auth.uid()::text or exists (
  select 1 from public.medical_records r join public.family_members f on f.id = r.family_member_id and f.user_id = auth.uid()
  where r.user_id = auth.uid() and (storage.foldername(name))[1] = r.family_member_id::text and
  (r.file_url = name or r.file_url like '%/medical_reports/' || name)
)));
create policy "Owner report cleanup" on storage.objects for delete to authenticated
using (bucket_id = 'medical_reports' and (storage.foldername(name))[1] = auth.uid()::text);
