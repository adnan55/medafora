export interface MemberRecord {
  id: string; full_name: string; relationship?: string | null; date_of_birth?: string | null; birth_date?: string | null
  allergies?: string[] | null; chronic_conditions?: string[] | null; blood_group?: string | null; gender?: string | null
  notes?: string | null; avatar_initials?: string | null
}
export interface MedicineRecord {
  id: string; medicine_name: string; family_member_id?: string | null; family_members?: MemberRecord | null
  expiry_date: string; is_banned?: boolean | null; salt_composition?: string | null; brand_or_manufacturer?: string | null
  storage_location?: string | null; dosage_form?: string | null; dosage_instructions?: string | null; primary_uses?: string | null
  quantity?: number | null; unit?: string | null; notes?: string | null; target_diseases?: string[] | null; is_daily_routine?: boolean | null
  strength?: string | null; manufacture_date?: string | null; batch_number?: string | null; ban_notice_details?: string | null
  last_safety_check?: string | null; last_regulatory_screen?: string | null
}
export interface BiomarkerRecord { name: string; value: string | number; unit?: string; status?: string; reference_range?: string; context?: string }
export interface ReportRecord {
  id: string; family_member_id: string; family_members?: MemberRecord | null; title: string; record_type: string
  test_date?: string | null; biomarkers?: BiomarkerRecord[] | null; diagnosis?: string | null; summary?: string | null
  hospital_clinic?: string | null; doctor_name?: string | null; file_url?: string | null; file_name?: string | null; file_type?: string | null
  ai_analysis?: Record<string, unknown> | null
}
export interface VitalRecord {
  id: string; family_member_id: string; family_members?: MemberRecord | null; name: string; vital_type: string
  value: number; value_secondary?: number | null; unit: string; status?: string; context?: string | null; recorded_at: string; notes?: string | null
}
