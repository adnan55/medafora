-- Apply after inspecting the deployed base schema (which was not supplied here).
alter table public.medicines add column if not exists last_regulatory_screen timestamptz;
-- Clinical memory must reference a member/record belonging to the same owner.
create or replace function public.validate_memory_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.family_members f where f.id = new.family_member_id and f.user_id = new.user_id) then
    raise exception 'Invalid patient ownership';
  end if;
  if new.source_record_id is not null and not exists (
    select 1 from public.medical_records r where r.id = new.source_record_id and r.user_id = new.user_id and r.family_member_id = new.family_member_id
  ) then raise exception 'Invalid source record ownership'; end if;
  return new;
end $$;
drop trigger if exists patient_memory_owner_guard on public.patient_clinical_memories;
create trigger patient_memory_owner_guard before insert or update on public.patient_clinical_memories
for each row execute function public.validate_memory_owner();

-- AI screens cannot directly change established ban flags or successful-check timestamps.
-- Every batch is recorded atomically; RLS still applies for authenticated callers.
create or replace function public.record_safety_screen(p_entries jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare item jsonb;
begin
  if auth.uid() is null and auth.role() <> 'service_role' then raise exception 'Unauthorized'; end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 50 then raise exception 'Invalid batch'; end if;
  for item in select value from jsonb_array_elements(p_entries) loop
    if item->>'result_status' not in ('WARNING', 'UNKNOWN') then raise exception 'Unsupported screen status'; end if;
    if not exists (select 1 from public.medicines m where m.id = (item->>'medicine_id')::uuid and (m.user_id = auth.uid() or auth.role() = 'service_role')) then raise exception 'Medicine not found'; end if;
    insert into public.safety_audit_logs(medicine_id, checked_at, result_status, summary, source_reference)
    values ((item->>'medicine_id')::uuid, (item->>'checked_at')::timestamptz, item->>'result_status', item->>'summary', item->>'source_reference');
    update public.medicines set last_regulatory_screen = now() where id = (item->>'medicine_id')::uuid;
  end loop;
end $$;
revoke all on function public.record_safety_screen(jsonb) from public, anon;
grant execute on function public.record_safety_screen(jsonb) to authenticated, service_role;

-- Restrict direct authenticated REST writes to audit-derived inventory fields.
create or replace function public.protect_medicine_audit_fields() returns trigger
language plpgsql set search_path = public as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if coalesce(new.is_banned, false) or new.last_safety_check is not null or new.ban_notice_details is not null then raise exception 'Audit fields are read-only'; end if;
    elsif new.is_banned is distinct from old.is_banned or new.last_safety_check is distinct from old.last_safety_check or new.ban_notice_details is distinct from old.ban_notice_details or new.user_id is distinct from old.user_id then
      raise exception 'Audit and owner fields are read-only';
    end if;
    if new.user_id is distinct from auth.uid() then raise exception 'Invalid medicine owner'; end if;
    if new.family_member_id is not null and not exists (select 1 from public.family_members f where f.id = new.family_member_id and f.user_id = auth.uid()) then raise exception 'Invalid member assignment'; end if;
  end if;
  return new;
end $$;
drop trigger if exists medicine_audit_field_guard on public.medicines;
create trigger medicine_audit_field_guard before insert or update on public.medicines
for each row execute function public.protect_medicine_audit_fields();

-- Apply the same parent ownership invariant to stored reports and vital readings.
create or replace function public.validate_patient_record_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.family_members f where f.id = new.family_member_id and f.user_id = new.user_id) then raise exception 'Invalid patient ownership'; end if;
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then raise exception 'Owner is immutable'; end if;
  if tg_table_name = 'medical_records' then
    if new.file_url is not null and new.file_url <> '' then
      if tg_op = 'INSERT' or new.file_url is distinct from old.file_url then
        if new.file_url not like new.user_id::text || '/' || new.family_member_id::text || '/%' or position('..' in new.file_url) > 0 then raise exception 'Invalid report attachment owner'; end if;
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists report_owner_guard on public.medical_records;
create trigger report_owner_guard before insert or update on public.medical_records for each row execute function public.validate_patient_record_owner();
drop trigger if exists vital_owner_guard on public.vital_logs;
create trigger vital_owner_guard before insert or update on public.vital_logs for each row execute function public.validate_patient_record_owner();

-- A lease prevents duplicate scheduled scans across workers, and expires after a crash.
create table if not exists public.safety_scan_lease (
  job text primary key, token uuid not null, expires_at timestamptz not null
);
alter table public.safety_scan_lease enable row level security;
revoke all on public.safety_scan_lease from public, anon, authenticated;
grant all on public.safety_scan_lease to service_role;
create or replace function public.acquire_safety_scan(p_token uuid) returns boolean
language plpgsql security invoker set search_path = public as $$
declare acquired integer;
begin
  if auth.role() <> 'service_role' then raise exception 'Unauthorized'; end if;
  insert into public.safety_scan_lease(job, token, expires_at) values ('regulatory', p_token, now() + interval '2 minutes')
  on conflict (job) do update set token = excluded.token, expires_at = excluded.expires_at where safety_scan_lease.expires_at <= now();
  get diagnostics acquired = row_count;
  return acquired = 1;
end $$;
create or replace function public.release_safety_scan(p_token uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if auth.role() <> 'service_role' then raise exception 'Unauthorized'; end if;
  delete from public.safety_scan_lease where job = 'regulatory' and token = p_token;
end $$;
revoke all on function public.acquire_safety_scan(uuid), public.release_safety_scan(uuid) from public, anon, authenticated;
grant execute on function public.acquire_safety_scan(uuid), public.release_safety_scan(uuid) to service_role;
