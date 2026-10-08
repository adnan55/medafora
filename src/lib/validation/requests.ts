import { z } from 'zod'

const text = z.string().trim().max(8000)
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Invalid calendar date')
const optionalDate = z.union([dateOnly, z.string().datetime().transform(v => v.slice(0, 10))]).nullable().optional()
const optionalText = text.nullable().optional()
export const medicineSchema = z.object({
  medicine_name: z.string().trim().min(1).max(200),
  brand_or_manufacturer: optionalText, salt_composition: optionalText,
  dosage_form: z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'OINTMENT', 'DROPS', 'INHALER', 'CREAM', 'GEL', 'INJECTION', 'POWDER / SACHET']),
  strength: optionalText, quantity: z.number().finite().min(0).max(1_000_000),
  unit: z.enum(['TABLETS', 'CAPSULES', 'STRIPS', 'BOTTLE (ML)', 'TUBE (G)', 'SACHETS', 'VIALS', 'PUFFS / DOSES']),
  expiry_date: optionalDate, manufacture_date: optionalDate, batch_number: optionalText,
  storage_location: z.string().trim().max(200), family_member_id: z.string().uuid().nullable().optional(),
  primary_uses: optionalText, dosage_instructions: optionalText, precautions: optionalText,
  target_diseases: z.array(z.string().trim().max(100)).max(50).optional(),
  is_daily_routine: z.boolean().optional(), is_prescription_required: z.boolean().optional(),
}).strict().refine(v => !v.expiry_date || !v.manufacture_date || v.manufacture_date <= v.expiry_date, 'Manufacture date must precede expiry')

const image = z.object({
  fileBase64: z.string().min(1).max(2_800_000).refine(v => /^[A-Za-z0-9+/\s]*={0,2}$/.test(v.replace(/^data:[^;]+;base64,/, '')), 'Invalid base64'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).optional(),
  label: z.string().max(200).optional(),
})
export const enrichSchema = z.object({ medicineName: z.string().trim().min(1).max(200), brandHint: z.string().max(200).optional() }).strict()
export const scanSchema = z.object({ images: z.array(image.refine(v => v.mimeType !== 'application/pdf', 'Medicine photos must be images')).max(4).default([]), notes: text.default('') }).refine(v => v.images.length > 0 || v.notes.length > 0, 'Photo or notes required')
export const reportSchema = z.object({ fileBase64: image.shape.fileBase64.optional(), mimeType: image.shape.mimeType, notes: text.optional(), patientName: z.string().max(200).optional() }).refine(v => !!v.fileBase64 || !!v.notes, 'Document or notes required')
export const summarySchema = z.object({ familyMemberId: z.string().uuid(), customQuery: text.optional() })
export const interactionSchema = z.object({ family_member_id: z.string().uuid(), new_medicine_salt: z.string().trim().min(1).max(1000), new_medicine_name: z.string().max(200).optional(), exclude_medicine_id: z.string().uuid().optional() })
export const chatSchema = z.object({ prompt: z.string().trim().min(1).max(8000), familyMemberId: z.string().uuid().optional() })

export const medicalRecordSchema = z.object({
  family_member_id: z.string().uuid(), title: z.string().trim().min(1).max(200),
  record_type: z.enum(['LAB_REPORT', 'DIAGNOSIS', 'PRESCRIPTION', 'IMAGING', 'DOCTOR_CONSULT', 'DISCHARGE_SUMMARY']),
  diagnosis: text.optional(), test_date: z.union([dateOnly, z.literal('')]).optional(),
  doctor_name: z.string().max(200).optional(), hospital_clinic: z.string().max(200).optional(), summary: text.optional(),
  biomarkers: z.array(z.object({ name: z.string().max(200), value: z.union([z.string().max(100), z.number().finite()]), unit: z.string().max(50), status: z.enum(['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL', 'UNKNOWN']), reference_range: z.string().max(200).optional() })).max(300).optional(),
  ai_analysis: z.record(z.string(), z.unknown()).optional(), file_url: z.string().max(2000).optional(),
  file_name: z.string().max(255).optional(), file_type: z.string().max(100).optional(),
}).strict()

// Validate task outputs, including the edge-function fallback, before returning success.
export const medicineOutput = z.object({ medicine_name: z.string().optional(), salt_composition: z.string().min(1) }).passthrough()
export const reportOutput = z.object({ title: z.string().min(1), biomarkers: z.array(z.object({ name: z.string(), value: z.union([z.string(), z.number()]), unit: z.string(), status: z.enum(['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'CRITICAL', 'UNKNOWN']) }).passthrough()).optional() }).passthrough()
export const summaryOutput = z.object({ clinical_overview: z.string().min(1), biomarker_highlights: z.array(z.string()), medication_evaluation: z.string(), vitals_trend_summary: z.string(), actionable_recommendations: z.array(z.string()), doctor_discussion_guide: z.array(z.string()), custom_answer: z.string().optional() })
