import { FunctionTool } from '@google/adk'
import { z } from 'zod'

export const evaluateBiomarkerRangeTool = new FunctionTool({
  name: 'evaluate_biomarker_range',
  description: 'Compares a value to supplied laboratory reference bounds in the same unit. Missing bounds are UNKNOWN; no diagnoses are inferred.',
  parameters: z.object({ biomarker_name: z.string(), value: z.number(), unit: z.string(), reference_min: z.number().optional(), reference_max: z.number().optional(), reference_unit: z.string().optional(), patient_age: z.number().optional() }),
  execute: async (input: { biomarker_name: string; value: number; unit: string; reference_min?: number; reference_max?: number; reference_unit?: string }) => {
    const { biomarker_name, value, unit, reference_min: min, reference_max: max, reference_unit } = input
    const usable = Number.isFinite(value) && !!reference_unit && unit === reference_unit && (min !== undefined || max !== undefined) && (min === undefined || Number.isFinite(min)) && (max === undefined || Number.isFinite(max)) && !(min !== undefined && max !== undefined && min > max)
    const status = !usable ? 'UNKNOWN' : min !== undefined && value < min ? 'LOW' : max !== undefined && value > max ? 'HIGH' : 'NORMAL'
    return { biomarker: biomarker_name, value, unit, status, reference_range: usable ? `${min ?? 'unbounded'} - ${max ?? 'unbounded'} ${unit}` : 'Not supplied or unit mismatch', clinical_interpretation: 'Reference comparison only. Clinical significance requires the laboratory report and clinician review.' }
  },
})
