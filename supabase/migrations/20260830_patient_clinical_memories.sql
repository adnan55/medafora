-- ==============================================================================
-- PATIENT CLINICAL MEMORIES TABLE (Longitudinal Clinical Memory for ADK Agents)
-- ==============================================================================

create table if not exists public.patient_clinical_memories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    family_member_id uuid references public.family_members(id) on delete cascade not null,
    category text not null default 'DIAGNOSTIC_ANOMALY', -- 'DIAGNOSTIC_ANOMALY', 'ALLERGY_ALERT', 'MEDICATION_ISSUE', 'CHRONIC_CONDITION', 'DOCTOR_DIRECTIVE'
    headline text not null,
    details text,
    underlying_reason_or_mechanism text,
    recommended_actions text,
    biomarker_context jsonb default '{}'::jsonb,
    source_record_id uuid references public.medical_records(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_patient_memories_member on public.patient_clinical_memories(family_member_id);
create index if not exists idx_patient_memories_user on public.patient_clinical_memories(user_id);
create index if not exists idx_patient_memories_category on public.patient_clinical_memories(category);

alter table public.patient_clinical_memories enable row level security;

create policy "Users can view own patient memories"
    on public.patient_clinical_memories for select
    using (auth.uid() = user_id);

create policy "Users can insert own patient memories"
    on public.patient_clinical_memories for insert
    with check (auth.uid() = user_id);

create policy "Users can update own patient memories"
    on public.patient_clinical_memories for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete own patient memories"
    on public.patient_clinical_memories for delete
    using (auth.uid() = user_id);
