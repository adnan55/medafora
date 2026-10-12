-- Owner-scoped policies already exist. Permissive legacy policies bypass them.
-- Keep existing owner policies and attachments; revoke only broad access.
drop policy if exists "Users can read medical reports" on storage.objects;
drop policy if exists "Users can upload medical reports" on storage.objects;
update storage.buckets set public = false where id = 'medical_reports';
